/**
 * Advanced Authentication Controller
 * คอนโทรลเลอร์สำหรับระบบ Authentication ขั้นสูง
 */

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const emailService = require('../services/emailService');
const deviceService = require('../services/deviceService');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

class AuthController {
  
  /**
   * สมัครสมาชิก
   */
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }
      
      const { username, email, password, firstName, lastName, phone } = req.body;
      
      // ตรวจสอบว่ามีผู้ใช้ซ้ำหรือไม่
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: existingUser.email === email 
            ? 'อีเมลนี้ถูกใช้งานแล้ว' 
            : 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว'
        });
      }
      
      // สร้างผู้ใช้ใหม่
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        phone,
        status: 'pending' // รอยืนยันอีเมล
      });
      
      // สร้าง email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();
      
      // ส่งอีเมลยืนยัน
      try {
        await emailService.sendEmailVerification(user.email, verificationToken);
      } catch (emailError) {
        console.error('ส่งอีเมลยืนยันไม่สำเร็จ:', emailError);
      }
      
      res.status(201).json({
        success: true,
        message: 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
      
    } catch (error) {
      console.error('Register Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * เข้าสู่ระบบ
   */
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }
      
      const { email, password, rememberMe = false } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      // ค้นหาผู้ใช้และตรวจสอบรหัสผ่าน
      const user = await User.findByCredentials(email, password);
      
      // อัปเดตข้อมูลการเข้าสู่ระบบ
      user.updateLoginInfo(ipAddress, userAgent);
      
      // แยกข้อมูล device
      const deviceInfo = deviceService.parseDeviceInfo(userAgent, ipAddress);
      
      // ถ้ามี MFA ให้สร้าง temporary token
      if (user.mfaEnabled) {
        const tempToken = crypto.randomBytes(32).toString('hex');
        
        // เก็บ temp token ใน cache/session (ใช้ memory ชั่วคราว)
        req.session.tempToken = {
          token: tempToken,
          userId: user._id.toString(),
          deviceInfo,
          expiresAt: Date.now() + 10 * 60 * 1000 // 10 นาที
        };
        
        return res.status(200).json({
          success: true,
          requiresMFA: true,
          tempToken,
          message: 'กรุณากรอกรหัส MFA เพื่อเข้าสู่ระบบ'
        });
      }
      
      // สร้าง tokens
      const accessToken = user.generateAccessToken();
      
      // สร้าง Refresh Token
      const refreshTokenDoc = await RefreshToken.createToken(
        user._id,
        deviceInfo,
        rememberMe ? '30d' : '7d'
      );
      
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        data: {
          accessToken,
          refreshToken: refreshTokenDoc.token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            mfaEnabled: user.mfaEnabled,
            lastLogin: user.lastLogin
          }
        }
      });
      
    } catch (error) {
      console.error('Login Error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'เข้าสู่ระบบไม่สำเร็จ'
      });
    }
  }
  
  /**
   * ยืนยัน MFA
   */
  async verifyMFA(req, res) {
    try {
      const { tempToken, mfaToken, backupCode } = req.body;
      
      if (!tempToken) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบ Temporary Token'
        });
      }
      
      // ตรวจสอบ temp token
      const tempSession = req.session.tempToken;
      if (!tempSession || tempSession.token !== tempToken || tempSession.expiresAt < Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'Temporary Token ไม่ถูกต้องหรือหมดอายุ'
        });
      }
      
      const user = await User.findById(tempSession.userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบผู้ใช้'
        });
      }
      
      let isValidMFA = false;
      
      // ตรวจสอบ MFA Token
      if (mfaToken) {
        isValidMFA = user.verifyMFAToken(mfaToken);
      }
      
      // ถ้า MFA Token ไม่ถูก ลอง Backup Code
      if (!isValidMFA && backupCode) {
        isValidMFA = user.useBackupCode(backupCode);
        if (isValidMFA) {
          await user.save(); // บันทึกการใช้ backup code
        }
      }
      
      if (!isValidMFA) {
        return res.status(400).json({
          success: false,
          message: 'รหัส MFA ไม่ถูกต้อง'
        });
      }
      
      // สร้าง tokens
      const accessToken = user.generateAccessToken();
      const refreshTokenDoc = await RefreshToken.createToken(
        user._id,
        tempSession.deviceInfo
      );
      
      // ลบ temp token
      delete req.session.tempToken;
      
      res.status(200).json({
        success: true,
        message: 'ยืนยัน MFA สำเร็จ',
        data: {
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
        }
      });
      
    } catch (error) {
      console.error('MFA Verify Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยืนยัน MFA'
      });
    }
  }
  
  /**
   * ต่ออายุ Access Token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบ Refresh Token'
        });
      }
      
      // ค้นหาและตรวจสอบ refresh token
      const tokenDoc = await RefreshToken.findValidToken(refreshToken);
      if (!tokenDoc) {
        return res.status(401).json({
          success: false,
          message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ'
        });
      }
      
      const user = tokenDoc.user;
      
      // อัปเดตการใช้งาน token
      await tokenDoc.updateUsage(req.ip, req.get('User-Agent'));
      
      // สร้าง access token ใหม่
      const newAccessToken = user.generateAccessToken();
      
      // Token rotation - สร้าง refresh token ใหม่
      const newRefreshTokenDoc = await RefreshToken.rotateToken(refreshToken);
      
      res.status(200).json({
        success: true,
        message: 'ต่ออายุ Token สำเร็จ',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshTokenDoc.token
        }
      });
      
    } catch (error) {
      console.error('Refresh Token Error:', error);
      res.status(401).json({
        success: false,
        message: 'ไม่สามารถต่ออายุ Token ได้'
      });
    }
  }
  
  /**
   * ออกจากระบบ
   */
  async logout(req, res) {
    try {
      const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
      
      if (refreshToken) {
        // ยกเลิก refresh token
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
        if (tokenDoc) {
          await tokenDoc.revoke('logout', 'user');
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'ออกจากระบบสำเร็จ'
      });
      
    } catch (error) {
      console.error('Logout Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
      });
    }
  }
  
  /**
   * ออกจากระบบทุกอุปกรณ์
   */
  async logoutAll(req, res) {
    try {
      const userId = req.user.id;
      
      // ยกเลิก refresh token ทั้งหมด
      await RefreshToken.revokeAllUserTokens(userId, 'logout_all');
      
      res.status(200).json({
        success: true,
        message: 'ออกจากระบบทุกอุปกรณ์สำเร็จ'
      });
      
    } catch (error) {
      console.error('Logout All Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบทุกอุปกรณ์'
      });
    }
  }
  
  /**
   * เปลี่ยนรหัสผ่าน
   */
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }
      
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select('+password');
      
      // ตรวจสอบรหัสผ่านปัจจุบัน
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
        });
      }
      
      // ตรวจสอบว่ารหัสผ่านใหม่ซ้ำกับรหัสเก่าหรือไม่
      const isPasswordInHistory = await user.checkPasswordHistory(newPassword);
      if (isPasswordInHistory) {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถใช้รหัสผ่านที่เคยใช้ใน 5 ครั้งล่าสุด'
        });
      }
      
      // อัปเดตรหัสผ่าน
      user.password = newPassword;
      await user.save();
      
      // ยกเลิก refresh token ทั้งหมด (บังคับให้เข้าสู่ระบบใหม่)
      await RefreshToken.revokeAllUserTokens(user._id, 'password_change');
      
      // ส่งอีเมลแจ้งเตือน
      try {
        await emailService.sendPasswordChangeNotification(user.email);
      } catch (emailError) {
        console.error('ส่งอีเมลแจ้งเตือนไม่สำเร็จ:', emailError);
      }
      
      res.status(200).json({
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่'
      });
      
    } catch (error) {
      console.error('Change Password Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
      });
    }
  }
  
  /**
   * ขอรีเซ็ตรหัสผ่าน
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // ไม่บอกว่าไม่พบผู้ใช้เพื่อป้องกัน email enumeration
        return res.status(200).json({
          success: true,
          message: 'หากอีเมลนี้อยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้'
        });
      }
      
      // สร้าง reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();
      
      // ส่งอีเมลรีเซ็ตรหัสผ่าน
      try {
        await emailService.sendPasswordReset(user.email, resetToken);
      } catch (emailError) {
        console.error('ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ:', emailError);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการส่งอีเมล'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'หากอีเมลนี้อยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้'
      });
      
    } catch (error) {
      console.error('Forgot Password Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน'
      });
    }
  }
  
  /**
   * รีเซ็ตรหัสผ่าน
   */
  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }
      
      const { token, newPassword } = req.body;
      
      // Hash token และค้นหาผู้ใช้
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      }).select('+password');
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Token ไม่ถูกต้องหรือหมดอายุ'
        });
      }
      
      // ตรวจสอบว่ารหัสผ่านใหม่ซ้ำกับรหัสเก่าหรือไม่
      const isPasswordInHistory = await user.checkPasswordHistory(newPassword);
      if (isPasswordInHistory) {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถใช้รหัสผ่านที่เคยใช้ใน 5 ครั้งล่าสุด'
        });
      }
      
      // อัปเดตรหัสผ่าน
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      // ยกเลิก refresh token ทั้งหมด
      await RefreshToken.revokeAllUserTokens(user._id, 'password_reset');
      
      res.status(200).json({
        success: true,
        message: 'รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่'
      });
      
    } catch (error) {
      console.error('Reset Password Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
      });
    }
  }
  
  /**
   * ยืนยันอีเมล
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      // Hash token และค้นหาผู้ใช้
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
      });
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Token ไม่ถูกต้องหรือหมดอายุ'
        });
      }
      
      // ยืนยันอีเมล
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      user.status = 'active';
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'ยืนยันอีเมลสำเร็จ'
      });
      
    } catch (error) {
      console.error('Verify Email Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยืนยันอีเมล'
      });
    }
  }
  
  /**
   * ส่งอีเมลยืนยันใหม่
   */
  async resendVerification(req, res) {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        isEmailVerified: false 
      });
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบผู้ใช้หรือได้รับการยืนยันแล้ว'
        });
      }
      
      // สร้าง verification token ใหม่
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();
      
      // ส่งอีเมลยืนยัน
      await emailService.sendEmailVerification(user.email, verificationToken);
      
      res.status(200).json({
        success: true,
        message: 'ส่งอีเมลยืนยันใหม่สำเร็จ'
      });
      
    } catch (error) {
      console.error('Resend Verification Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน'
      });
    }
  }
  
  /**
   * ดูข้อมูลโปรไฟล์
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          phone: user.phone,
          avatar: user.avatar,
          roles: user.roles,
          permissions: user.permissions,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          mfaEnabled: user.mfaEnabled,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          preferences: user.preferences
        }
      });
      
    } catch (error) {
      console.error('Get Profile Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์'
      });
    }
  }
  
  /**
   * ดูอุปกรณ์ที่เข้าสู่ระบบ
   */
  async getDevices(req, res) {
    try {
      const userId = req.user.id;
      const tokens = await RefreshToken.getUserTokens(userId, true);
      
      const devices = tokens.map(token => ({
        deviceId: token.deviceId,
        deviceInfo: token.deviceInfo,
        ipAddress: token.ipAddress,
        location: token.location,
        lastUsed: token.lastUsed,
        createdAt: token.createdAt
      }));
      
      res.status(200).json({
        success: true,
        data: devices
      });
      
    } catch (error) {
      console.error('Get Devices Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์'
      });
    }
  }
  
  /**
   * ออกจากระบบอุปกรณ์เฉพาะ
   */
  async revokeDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;
      
      await RefreshToken.revokeDeviceTokens(userId, deviceId);
      
      res.status(200).json({
        success: true,
        message: 'ออกจากระบบอุปกรณ์สำเร็จ'
      });
      
    } catch (error) {
      console.error('Revoke Device Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบอุปกรณ์'
      });
    }
  }
}

module.exports = new AuthController();