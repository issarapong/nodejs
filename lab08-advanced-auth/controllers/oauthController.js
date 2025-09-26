/**
 * OAuth Controller - Social Login Integration
 * คอนโทรลเลอร์สำหรับการเข้าสู่ระบบผ่าน OAuth Providers
 */

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const deviceService = require('../services/deviceService');
const passport = require('passport');

class OAuthController {
  
  /**
   * เข้าสู่ระบบด้วย Google - เริ่มต้น OAuth flow
   */
  googleAuth(req, res, next) {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  }
  
  /**
   * Callback จาก Google OAuth
   */
  async googleCallback(req, res, next) {
    passport.authenticate('google', { 
      failureRedirect: '/auth/login?error=google_failed',
      session: false 
    }, async (err, profile) => {
      try {
        if (err || !profile) {
          return res.redirect('/auth/login?error=google_failed');
        }
        
        const result = await this.handleOAuthLogin(req, profile, 'google');
        
        if (result.requiresMFA) {
          // Redirect to MFA page with temp token
          return res.redirect(`/auth/mfa?temp_token=${result.tempToken}`);
        }
        
        // Success - redirect with tokens
        const redirectUrl = `/auth/success?access_token=${result.accessToken}&refresh_token=${result.refreshToken}`;
        return res.redirect(redirectUrl);
        
      } catch (error) {
        console.error('Google OAuth Callback Error:', error);
        return res.redirect('/auth/login?error=oauth_error');
      }
    })(req, res, next);
  }
  
  /**
   * เข้าสู่ระบบด้วย Facebook - เริ่มต้น OAuth flow
   */
  facebookAuth(req, res, next) {
    passport.authenticate('facebook', {
      scope: ['email']
    })(req, res, next);
  }
  
  /**
   * Callback จาก Facebook OAuth
   */
  async facebookCallback(req, res, next) {
    passport.authenticate('facebook', { 
      failureRedirect: '/auth/login?error=facebook_failed',
      session: false 
    }, async (err, profile) => {
      try {
        if (err || !profile) {
          return res.redirect('/auth/login?error=facebook_failed');
        }
        
        const result = await this.handleOAuthLogin(req, profile, 'facebook');
        
        if (result.requiresMFA) {
          return res.redirect(`/auth/mfa?temp_token=${result.tempToken}`);
        }
        
        const redirectUrl = `/auth/success?access_token=${result.accessToken}&refresh_token=${result.refreshToken}`;
        return res.redirect(redirectUrl);
        
      } catch (error) {
        console.error('Facebook OAuth Callback Error:', error);
        return res.redirect('/auth/login?error=oauth_error');
      }
    })(req, res, next);
  }
  
  /**
   * จัดการ OAuth Login - ใช้ร่วมกันสำหรับทุก Provider
   */
  async handleOAuthLogin(req, profile, provider) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // ค้นหาผู้ใช้จาก OAuth ID หรือ email
    let user = await User.findOne({
      $or: [
        { [`${provider}Id`]: profile.id },
        { email: profile.emails[0].value.toLowerCase() }
      ]
    });
    
    if (user) {
      // ผู้ใช้มีอยู่แล้ว - อัปเดตข้อมูล OAuth ID
      if (!user[`${provider}Id`]) {
        user[`${provider}Id`] = profile.id;
        await user.save();
      }
    } else {
      // สร้างผู้ใช้ใหม่
      user = new User({
        username: this.generateUsername(profile),
        email: profile.emails[0].value.toLowerCase(),
        firstName: profile.name.givenName || '',
        lastName: profile.name.familyName || '',
        [`${provider}Id`]: profile.id,
        isEmailVerified: true, // OAuth emails ถือว่าได้รับการยืนยันแล้ว
        status: 'active',
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null
      });
      
      // สร้างรหัสผ่านสุ่มสำหรับ OAuth users
      user.password = this.generateRandomPassword();
      await user.save();
    }
    
    // อัปเดตข้อมูลการเข้าสู่ระบบ
    user.updateLoginInfo(ipAddress, userAgent);
    
    // แยกข้อมูล device
    const deviceInfo = deviceService.parseDeviceInfo(userAgent, ipAddress);
    
    // ถ้ามี MFA ให้สร้าง temporary token
    if (user.mfaEnabled) {
      const tempToken = require('crypto').randomBytes(32).toString('hex');
      
      req.session.tempToken = {
        token: tempToken,
        userId: user._id.toString(),
        deviceInfo,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 นาที
      };
      
      return {
        requiresMFA: true,
        tempToken
      };
    }
    
    // สร้าง tokens
    const accessToken = user.generateAccessToken();
    const refreshTokenDoc = await RefreshToken.createToken(user._id, deviceInfo);
    
    await user.save();
    
    return {
      requiresMFA: false,
      accessToken,
      refreshToken: refreshTokenDoc.token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles
      }
    };
  }
  
  /**
   * เชื่อมต่อบัญชี OAuth (สำหรับผู้ใช้ที่ล็อกอินแล้ว)
   */
  async linkAccount(req, res) {
    try {
      const { provider } = req.params;
      const user = await User.findById(req.user.id);
      
      if (user[`${provider}Id`]) {
        return res.status(400).json({
          success: false,
          message: `บัญชี ${provider} ถูกเชื่อมต่อแล้ว`
        });
      }
      
      // เก็บ user ID ใน session เพื่อใช้ในการ link หลัง OAuth
      req.session.linkUserId = user._id.toString();
      
      // Redirect ไปยัง OAuth provider
      const authUrl = `/api/auth/${provider}?link=true`;
      
      res.status(200).json({
        success: true,
        message: `กำลังเชื่อมต่อบัญชี ${provider}`,
        authUrl
      });
      
    } catch (error) {
      console.error('Link Account Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อบัญชี'
      });
    }
  }
  
  /**
   * ยกเลิกการเชื่อมต่อบัญชี OAuth
   */
  async unlinkAccount(req, res) {
    try {
      const { provider } = req.params;
      const user = await User.findById(req.user.id).select('+password');
      
      if (!user[`${provider}Id`]) {
        return res.status(400).json({
          success: false,
          message: `บัญชี ${provider} ไม่ได้เชื่อมต่อ`
        });
      }
      
      // ตรวจสอบว่ามีรหัสผ่านหรือ OAuth provider อื่น
      const hasPassword = user.password && user.password.length > 0;
      const hasOtherOAuth = (provider === 'google' && user.facebookId) || 
                          (provider === 'facebook' && user.googleId);
      
      if (!hasPassword && !hasOtherOAuth) {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถยกเลิกการเชื่อมต่อได้ กรุณาตั้งรหัสผ่านหรือเชื่อมต่อ OAuth อื่นก่อน'
        });
      }
      
      // ยกเลิกการเชื่อมต่อ
      user[`${provider}Id`] = undefined;
      await user.save();
      
      res.status(200).json({
        success: true,
        message: `ยกเลิกการเชื่อมต่อบัญชี ${provider} สำเร็จ`
      });
      
    } catch (error) {
      console.error('Unlink Account Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อบัญชี'
      });
    }
  }
  
  /**
   * ดูสถานะการเชื่อมต่อ OAuth
   */
  async getOAuthStatus(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      res.status(200).json({
        success: true,
        data: {
          google: {
            connected: !!user.googleId,
            id: user.googleId ? user.googleId.substring(0, 8) + '...' : null
          },
          facebook: {
            connected: !!user.facebookId,
            id: user.facebookId ? user.facebookId.substring(0, 8) + '...' : null
          }
        }
      });
      
    } catch (error) {
      console.error('Get OAuth Status Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถานะ OAuth'
      });
    }
  }
  
  /**
   * สร้าง username จาก OAuth profile
   */
  generateUsername(profile) {
    let username = profile.username || 
                  profile.displayName?.replace(/\s+/g, '_').toLowerCase() ||
                  profile.emails[0].value.split('@')[0];
    
    // เพิ่มหมายเลขสุ่มเพื่อป้องกันชื่อซ้ำ
    username += '_' + Math.random().toString(36).substr(2, 6);
    
    return username;
  }
  
  /**
   * สร้างรหัสผ่านสุ่มสำหรับ OAuth users
   */
  generateRandomPassword() {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

module.exports = new OAuthController();