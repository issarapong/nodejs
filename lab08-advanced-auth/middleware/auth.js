/**
 * Authentication Middleware
 * มิดเดิลแวร์สำหรับการตรวจสอบ Authentication และ Authorization
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

class AuthMiddleware {
  
  /**
   * ตรวจสอบ JWT Token
   */
  async authenticate(req, res, next) {
    try {
      // ดึง token จาก header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'ไม่พบ Access Token',
          code: 'NO_TOKEN'
        });
      }
      
      const token = authHeader.substring(7); // เอา "Bearer " ออก
      
      try {
        // ตรวจสอบและ decode token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        
        // ดึงข้อมูลผู้ใช้
        const user = await User.findById(decoded.id);
        if (!user || user.status !== 'active') {
          return res.status(401).json({
            success: false,
            message: 'ผู้ใช้ไม่ถูกต้องหรือบัญชีถูกปิดใช้งาน',
            code: 'INVALID_USER'
          });
        }
        
        // ตรวจสอบว่ามีการเปลี่ยนรหัสผ่านหลังจากสร้าง token หรือไม่
        if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
          return res.status(401).json({
            success: false,
            message: 'รหัสผ่านถูกเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่',
            code: 'PASSWORD_CHANGED'
          });
        }
        
        // เก็บข้อมูลผู้ใช้ใน request object
        req.user = {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions
        };
        
        next();
        
      } catch (jwtError) {
        let message = 'Access Token ไม่ถูกต้อง';
        let code = 'INVALID_TOKEN';
        
        if (jwtError.name === 'TokenExpiredError') {
          message = 'Access Token หมดอายุ';
          code = 'TOKEN_EXPIRED';
        } else if (jwtError.name === 'JsonWebTokenError') {
          message = 'Access Token ไม่ถูกต้อง';
          code = 'INVALID_TOKEN';
        }
        
        return res.status(401).json({
          success: false,
          message,
          code
        });
      }
      
    } catch (error) {
      console.error('Authentication Error:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
      });
    }
  }
  
  /**
   * ตรวจสอบ Role
   */
  requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'กรุณาเข้าสู่ระบบก่อน'
        });
      }
      
      const hasRole = req.user.roles.some(role => roles.includes(role));
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์เข้าถึง',
          required: roles,
          current: req.user.roles
        });
      }
      
      next();
    };
  }
  
  /**
   * ตรวจสอบ Permission
   */
  requirePermission(...permissions) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'กรุณาเข้าสู่ระบบก่อน'
        });
      }
      
      const hasPermission = req.user.permissions.some(permission => permissions.includes(permission));
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์ในการดำเนินการนี้',
          required: permissions,
          current: req.user.permissions
        });
      }
      
      next();
    };
  }
  
  /**
   * ตรวจสอบว่าเป็นเจ้าของ resource หรือมี role ที่สูงกว่า
   */
  requireOwnershipOrRole(resourceUserIdField = 'userId', ...roles) {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'กรุณาเข้าสู่ระบบก่อน'
        });
      }
      
      // ตรวจสอบ role ก่อน
      const hasRole = req.user.roles.some(role => roles.includes(role));
      if (hasRole) {
        return next(); // มี role สูงกว่า ผ่านไปเลย
      }
      
      // ตรวจสอบความเป็นเจ้าของ
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      if (req.user.id === resourceUserId) {
        return next(); // เป็นเจ้าของ
      }
      
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
      });
    };
  }
  
  /**
   * ตรวจสอบการยืนยันอีเมล
   */
  requireEmailVerified(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อน'
      });
    }
    
    // ดึงข้อมูลผู้ใช้เพื่อตรวจสอบ email verification
    User.findById(req.user.id)
      .then(user => {
        if (!user.isEmailVerified) {
          return res.status(403).json({
            success: false,
            message: 'กรุณายืนยันอีเมลก่อนใช้งานฟีเจอร์นี้',
            code: 'EMAIL_NOT_VERIFIED'
          });
        }
        next();
      })
      .catch(error => {
        console.error('Email verification check error:', error);
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการตรวจสอบการยืนยันอีเมล'
        });
      });
  }
  
  /**
   * ตรวจสอบสถานะบัญชี
   */
  requireActiveAccount(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อน'
      });
    }
    
    User.findById(req.user.id)
      .then(user => {
        if (user.status !== 'active') {
          let message = 'บัญชีถูกปิดใช้งาน';
          if (user.status === 'suspended') {
            message = 'บัญชีถูกระงับ กรุณาติดต่อผู้ดูแลระบบ';
          } else if (user.status === 'pending') {
            message = 'บัญชีรอการยืนยัน';
          }
          
          return res.status(403).json({
            success: false,
            message,
            code: `ACCOUNT_${user.status.toUpperCase()}`
          });
        }
        next();
      })
      .catch(error => {
        console.error('Account status check error:', error);
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะบัญชี'
        });
      });
  }
  
  /**
   * Optional Authentication - ไม่บังคับต้องเข้าสู่ระบบ
   */
  async optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // ไม่มี token ก็ไม่เป็นไร
    }
    
    try {
      await this.authenticate(req, res, next);
    } catch (error) {
      // ถ้า token ไม่ถูกต้อง ให้ผ่านไปได้ แต่ไม่มีข้อมูลผู้ใช้
      next();
    }
  }
  
  /**
   * ตรวจสอบ Rate Limit สำหรับแต่ละผู้ใช้
   */
  userRateLimit(maxRequests = 100, windowMs = 60 * 60 * 1000) {
    const requests = new Map(); // เก็บใน memory (ใน production ควรใช้ Redis)
    
    return (req, res, next) => {
      if (!req.user) {
        return next(); // ไม่มีผู้ใช้ ไม่ต้องตรวจสอบ
      }
      
      const userId = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(userId)) {
        requests.set(userId, []);
      }
      
      const userRequests = requests.get(userId);
      
      // ลบ request ที่เก่าออก
      const validRequests = userRequests.filter(time => time > windowStart);
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'มีการใช้งานมากเกินไป กรุณาลองใหม่ในภายหลัง',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      validRequests.push(now);
      requests.set(userId, validRequests);
      
      // เพิ่ม headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': maxRequests - validRequests.length,
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });
      
      next();
    };
  }
}

module.exports = new AuthMiddleware();