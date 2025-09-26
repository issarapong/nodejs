/**
 * Rate Limiting Middleware
 * มิดเดิลแวร์สำหรับจำกัดอัตราการเข้าถึง
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const User = require('../models/User');

class RateLimitMiddleware {
  
  /**
   * Rate limit ทั่วไป
   */
  general() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 นาที
      max: 1000, // จำกัด 1000 requests ต่อ IP ใน 15 นาที
      message: {
        success: false,
        message: 'มีการเข้าถึงมากเกินไป กรุณาลองใหม่ในภายหลัง',
        retryAfter: '15 นาที'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: 'มีการเข้าถึงมากเกินไป กรุณาลองใหม่ในภายหลัง',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }
  
  /**
   * Rate limit สำหรับการเข้าสู่ระบบ
   */
  login() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 นาที
      max: 10, // จำกัด 10 ครั้งต่อ IP ใน 15 นาที
      skipSuccessfulRequests: true, // ไม่นับ request ที่สำเร็จ
      message: {
        success: false,
        message: 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ใน 15 นาที',
        code: 'TOO_MANY_LOGIN_ATTEMPTS'
      },
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ในภายหลัง',
          code: 'TOO_MANY_LOGIN_ATTEMPTS',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }
  
  /**
   * Rate limit สำหรับการสมัครสมาชิก
   */
  register() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
      max: 5, // จำกัด 5 ครั้งต่อ IP ใน 1 ชั่วโมง
      message: {
        success: false,
        message: 'มีการสมัครสมาชิกมากเกินไป กรุณาลองใหม่ในอีก 1 ชั่วโมง',
        code: 'TOO_MANY_REGISTRATIONS'
      }
    });
  }
  
  /**
   * Rate limit สำหรับการรีเซ็ตรหัสผ่าน
   */
  passwordReset() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
      max: 3, // จำกัด 3 ครั้งต่อ IP ใน 1 ชั่วโมง
      message: {
        success: false,
        message: 'มีการขอรีเซ็ตรหัสผ่านมากเกินไป กรุณาลองใหม่ในอีก 1 ชั่วโมง',
        code: 'TOO_MANY_PASSWORD_RESETS'
      }
    });
  }
  
  /**
   * Rate limit สำหรับการส่งอีเมลยืนยัน
   */
  emailVerification() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 นาที
      max: 3, // จำกัด 3 ครั้งต่อ IP ใน 10 นาที
      message: {
        success: false,
        message: 'มีการขออีเมลยืนยันมากเกินไป กรุณาลองใหม่ในอีก 10 นาที',
        code: 'TOO_MANY_VERIFICATION_EMAILS'
      }
    });
  }
  
  /**
   * Rate limit สำหรับ MFA operations
   */
  mfa() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 นาที
      max: 20, // จำกัด 20 ครั้งต่อ IP ใน 15 นาที
      message: {
        success: false,
        message: 'มีการพยายาม MFA มากเกินไป กรุณาลองใหม่ในภายหลัง',
        code: 'TOO_MANY_MFA_ATTEMPTS'
      }
    });
  }
  
  /**
   * Slow down สำหรับการพยายามเข้าสู่ระบบที่ผิดซ้ำๆ
   */
  loginSlowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 นาที
      delayAfter: 3, // เริ่มชะลอหลังจากครั้งที่ 3
      delayMs: 500, // เพิ่ม delay 500ms ทุกครั้ง
      maxDelayMs: 10000, // delay สูงสุด 10 วินาที
      skipSuccessfulRequests: true
    });
  }
  
  /**
   * Rate limit แบบ Progressive สำหรับแต่ละผู้ใช้
   */
  progressiveUserLimit() {
    const attempts = new Map(); // ใน production ควรใช้ Redis
    
    return async (req, res, next) => {
      if (!req.body.email) {
        return next();
      }
      
      const email = req.body.email.toLowerCase();
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 นาที
      
      try {
        // ตรวจสอบ login attempts ใน database
        const user = await User.findOne({ email });
        if (user && user.isLocked) {
          return res.status(423).json({
            success: false,
            message: `บัญชีถูกล็อค กรุณาลองใหม่ใน ${Math.ceil((user.lockUntil - Date.now()) / 60000)} นาที`,
            code: 'ACCOUNT_LOCKED',
            lockUntil: user.lockUntil
          });
        }
        
        // ตรวจสอบ IP-based attempts
        if (!attempts.has(email)) {
          attempts.set(email, []);
        }
        
        const userAttempts = attempts.get(email);
        const validAttempts = userAttempts.filter(time => time > (now - windowMs));
        
        // คำนวณ delay แบบ progressive
        let delay = 0;
        if (validAttempts.length > 3) {
          delay = Math.min(validAttempts.length * 1000, 30000); // สูงสุด 30 วินาที
        }
        
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // เพิ่ม attempt ใหม่
        validAttempts.push(now);
        attempts.set(email, validAttempts);
        
        next();
        
      } catch (error) {
        console.error('Progressive rate limit error:', error);
        next();
      }
    };
  }
  
  /**
   * Rate limit สำหรับ API endpoints ที่ต้องการความปลอดภัยสูง
   */
  sensitive() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
      max: 10, // จำกัด 10 ครั้งต่อ IP ใน 1 ชั่วโมง
      message: {
        success: false,
        message: 'การดำเนินการนี้ถูกจำกัด กรุณาลองใหม่ในภายหลัง',
        code: 'SENSITIVE_OPERATION_LIMIT'
      }
    });
  }
  
  /**
   * Dynamic rate limit ตาม user role
   */
  dynamicByRole() {
    return (req, res, next) => {
      let maxRequests = 100; // default สำหรับ guest
      
      if (req.user) {
        if (req.user.roles.includes('admin')) {
          maxRequests = 10000;
        } else if (req.user.roles.includes('moderator')) {
          maxRequests = 1000;
        } else {
          maxRequests = 500; // logged in users
        }
      }
      
      const userLimit = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
        max: maxRequests,
        keyGenerator: (req) => {
          return req.user ? req.user.id : req.ip;
        },
        message: {
          success: false,
          message: `เกินขีดจำกัดการใช้งาน (${maxRequests} requests/ชั่วโมง)`,
          code: 'USER_RATE_LIMIT'
        }
      });
      
      userLimit(req, res, next);
    };
  }
  
  /**
   * Clean up expired attempts (ควรเรียกเป็นระยะๆ)
   */
  cleanup() {
    // ลบ attempts ที่เก่าออก (สำหรับ in-memory storage)
    // ใน production ควรใช้ Redis TTL
    setInterval(() => {
      const now = Date.now();
      const windowMs = 15 * 60 * 1000;
      
      // Implementation จะขึ้นอยู่กับการเก็บข้อมูล
      console.log('🧹 Cleanup rate limit data...');
    }, 5 * 60 * 1000); // ทุก 5 นาที
  }
}

module.exports = new RateLimitMiddleware();