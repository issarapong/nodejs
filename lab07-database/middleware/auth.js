/**
 * Authentication Middleware - จัดการการตรวจสอบสิทธิ์
 * รวมถึงการตรวจสอบ JWT Token และบทบาทผู้ใช้
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware สำหรับตรวจสอบการเข้าสู่ระบบ
 * ตรวจสอบ JWT Token ใน Authorization header
 */
const auth = async (req, res, next) => {
  try {
    // ดึง token จาก header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Authorization header',
        error: 'NO_TOKEN'
      });
    }

    // ตรวจสอบรูปแบบ Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'รูปแบบ Token ไม่ถูกต้อง',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }

    // แยก token ออกจาก "Bearer "
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Access Token',
        error: 'NO_TOKEN'
      });
    }

    // ตรวจสอบและ decode token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'nodejs-lab-secret');
    } catch (jwtError) {
      let errorMessage = 'Token ไม่ถูกต้องหรือหมดอายุ';
      let errorCode = 'INVALID_TOKEN';

      if (jwtError.name === 'TokenExpiredError') {
        errorMessage = 'Token หมดอายุแล้ว';
        errorCode = 'TOKEN_EXPIRED';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorMessage = 'Token ไม่ถูกต้อง';
        errorCode = 'MALFORMED_TOKEN';
      }

      return res.status(401).json({
        success: false,
        message: errorMessage,
        error: errorCode
      });
    }

    // ค้นหาผู้ใช้ในฐานข้อมูล
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
        error: 'USER_NOT_FOUND'
      });
    }

    // ตรวจสอบว่าผู้ใช้ยังคงใช้งานได้
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'บัญชีผู้ใช้ถูกระงับการใช้งาน',
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    // เก็บข้อมูลผู้ใช้ใน request object
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified
    };

    req.token = token;

    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
      error: 'AUTHENTICATION_ERROR'
    });
  }
};

/**
 * Middleware สำหรับตรวจสอบสิทธิ์ Admin
 * ใช้หลังจาก auth middleware
 */
const adminAuth = (req, res, next) => {
  try {
    // ตรวจสอบว่าผ่าน auth middleware แล้ว
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อน',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    // ตรวจสอบบทบาทของผู้ใช้
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin)',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Admin authentication error:', error);

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ Admin',
      error: 'ADMIN_AUTH_ERROR'
    });
  }
};

/**
 * Middleware สำหรับตรวจสอบสิทธิ์ Moderator หรือ Admin
 * ใช้หลังจาก auth middleware
 */
const moderatorAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อน',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin หรือ Moderator)',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Moderator authentication error:', error);

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ Moderator',
      error: 'MODERATOR_AUTH_ERROR'
    });
  }
};

/**
 * Middleware สำหรับตรวจสอบการเข้าถึงข้อมูลส่วนตัว
 * ตรวจสอบว่าผู้ใช้เข้าถึงข้อมูลของตัวเองหรือเป็น Admin
 */
const ownerOrAdminAuth = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'กรุณาเข้าสู่ระบบก่อน',
          error: 'AUTHENTICATION_REQUIRED'
        });
      }

      const resourceId = req.params[paramName];
      
      // ถ้าเป็น Admin ให้ผ่านเลย
      if (req.user.role === 'admin') {
        return next();
      }

      // ตรวจสอบว่าเป็นเจ้าของข้อมูลหรือไม่
      if (req.user.id !== resourceId) {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
          error: 'ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('❌ Owner/Admin authentication error:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
        error: 'OWNER_AUTH_ERROR'
      });
    }
  };
};

/**
 * Middleware สำหรับ Optional Authentication
 * ไม่บังคับให้ login แต่ถ้า login จะเก็บข้อมูลผู้ใช้ไว้
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    // ถ้าไม่มี token ให้ผ่านไปเลย
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nodejs-lab-secret');
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified
        };
      }
    } catch (jwtError) {
      // ถ้า token ไม่ถูกต้อง ให้ผ่านไปแบบไม่มี user
      console.log('Invalid token in optional auth:', jwtError.message);
    }

    next();
  } catch (error) {
    console.error('❌ Optional authentication error:', error);
    next(); // ให้ผ่านไปแม้จะมีข้อผิดพลาด
  }
};

/**
 * Middleware สำหรับตรวจสอบ Refresh Token
 */
const refreshTokenAuth = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Refresh Token',
        error: 'NO_REFRESH_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || 'nodejs-lab-refresh-secret'
      );

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Token ไม่ถูกต้อง',
          error: 'INVALID_TOKEN_TYPE'
        });
      }

      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'ไม่พบผู้ใช้หรือบัญชีถูกระงับ',
          error: 'USER_NOT_FOUND'
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Refresh Token หมดอายุหรือไม่ถูกต้อง',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }
  } catch (error) {
    console.error('❌ Refresh token authentication error:', error);

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ Refresh Token',
      error: 'REFRESH_TOKEN_ERROR'
    });
  }
};

module.exports = {
  auth,
  adminAuth,
  moderatorAuth,
  ownerOrAdminAuth,
  optionalAuth,
  refreshTokenAuth
};