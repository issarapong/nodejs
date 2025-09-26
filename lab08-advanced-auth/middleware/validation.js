/**
 * Validation Middleware
 * มิดเดิลแวร์สำหรับตรวจสอบความถูกต้องของข้อมูล
 */

const { body, param, query } = require('express-validator');
const User = require('../models/User');
const zxcvbn = require('zxcvbn');

class ValidationMiddleware {
  
  /**
   * Validation สำหรับการสมัครสมาชิก
   */
  register() {
    return [
      body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('ชื่อผู้ใช้ต้องมี 3-30 ตัวอักษร')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _')
        .custom(async (value) => {
          const user = await User.findOne({ username: value.toLowerCase() });
          if (user) {
            throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
          }
        }),
      
      body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('รูปแบบอีเมลไม่ถูกต้อง')
        .custom(async (value) => {
          const user = await User.findOne({ email: value.toLowerCase() });
          if (user) {
            throw new Error('อีเมลนี้ถูกใช้งานแล้ว');
          }
        }),
      
      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('รหัสผ่านต้องมี 8-128 ตัวอักษร')
        .custom((value) => {
          const result = zxcvbn(value);
          if (result.score < 2) {
            throw new Error('รหัสผ่านไม่ปลอดภัยพอ กรุณาใช้รหัสผ่านที่ซับซ้อนมากขึ้น');
          }
          return true;
        }),
      
      body('firstName')
        .trim()
        .notEmpty()
        .withMessage('กรุณาระบุชื่อจริง')
        .isLength({ max: 50 })
        .withMessage('ชื่อจริงต้องไม่เกิน 50 ตัวอักษร'),
      
      body('lastName')
        .trim()
        .notEmpty()
        .withMessage('กรุณาระบุนามสกุล')
        .isLength({ max: 50 })
        .withMessage('นามสกุลต้องไม่เกิน 50 ตัวอักษร'),
      
      body('phone')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('เบอร์โทรต้องเป็นตัวเลข 10 หลัก')
    ];
  }
  
  /**
   * Validation สำหรับการเข้าสู่ระบบ
   */
  login() {
    return [
      body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
      
      body('password')
        .notEmpty()
        .withMessage('กรุณาระบุรหัสผ่าน'),
      
      body('rememberMe')
        .optional()
        .isBoolean()
        .withMessage('rememberMe ต้องเป็น boolean')
    ];
  }
  
  /**
   * Validation สำหรับการเปลี่ยนรหัสผ่าน
   */
  changePassword() {
    return [
      body('currentPassword')
        .notEmpty()
        .withMessage('กรุณาระบุรหัสผ่านปัจจุบัน'),
      
      body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('รหัสผ่านใหม่ต้องมี 8-128 ตัวอักษร')
        .custom((value, { req }) => {
          if (value === req.body.currentPassword) {
            throw new Error('รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน');
          }
          const result = zxcvbn(value);
          if (result.score < 2) {
            throw new Error('รหัสผ่านใหม่ไม่ปลอดภัยพอ กรุณาใช้รหัสผ่านที่ซับซ้อนมากขึ้น');
          }
          return true;
        })
    ];
  }
  
  /**
   * Validation สำหรับการรีเซ็ตรหัสผ่าน
   */
  resetPassword() {
    return [
      body('token')
        .notEmpty()
        .withMessage('กรุณาระบุ token')
        .isLength({ min: 40, max: 100 })
        .withMessage('Token ไม่ถูกต้อง'),
      
      body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('รหัสผ่านใหม่ต้องมี 8-128 ตัวอักษร')
        .custom((value) => {
          const result = zxcvbn(value);
          if (result.score < 2) {
            throw new Error('รหัสผ่านใหม่ไม่ปลอดภัยพอ กรุณาใช้รหัสผ่านที่ซับซ้อนมากขึ้น');
          }
          return true;
        })
    ];
  }
  
  /**
   * Validation สำหรับ MFA Token
   */
  mfaToken() {
    return [
      body('token')
        .optional()
        .matches(/^[0-9]{6}$/)
        .withMessage('รหัส MFA ต้องเป็นตัวเลข 6 หลัก'),
      
      body('backupCode')
        .optional()
        .matches(/^[A-F0-9]{8}$/)
        .withMessage('รหัสสำรองไม่ถูกต้อง'),
      
      body('tempToken')
        .optional()
        .isLength({ min: 40, max: 100 })
        .withMessage('Temporary token ไม่ถูกต้อง')
    ];
  }
  
  /**
   * Validation สำหรับการอัปเดตโปรไฟล์
   */
  updateProfile() {
    return [
      body('firstName')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('ชื่อจริงต้องไม่ว่าง')
        .isLength({ max: 50 })
        .withMessage('ชื่อจริงต้องไม่เกิน 50 ตัวอักษร'),
      
      body('lastName')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('นามสกุลต้องไม่ว่าง')
        .isLength({ max: 50 })
        .withMessage('นามสกุลต้องไม่เกิน 50 ตัวอักษร'),
      
      body('phone')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('เบอร์โทรต้องเป็นตัวเลข 10 หลัก'),
      
      body('preferences.language')
        .optional()
        .isIn(['th', 'en'])
        .withMessage('ภาษาต้องเป็น th หรือ en'),
      
      body('preferences.timezone')
        .optional()
        .matches(/^[A-Za-z]+\/[A-Za-z_]+$/)
        .withMessage('รูปแบบ timezone ไม่ถูกต้อง'),
      
      body('preferences.emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('การแจ้งเตือนอีเมลต้องเป็น boolean'),
      
      body('preferences.smsNotifications')
        .optional()
        .isBoolean()
        .withMessage('การแจ้งเตือน SMS ต้องเป็น boolean')
    ];
  }
  
  /**
   * Validation สำหรับ Admin operations
   */
  adminUserUpdate() {
    return [
      param('userId')
        .isMongoId()
        .withMessage('User ID ไม่ถูกต้อง'),
      
      body('roles')
        .optional()
        .isArray()
        .withMessage('roles ต้องเป็น array')
        .custom((roles) => {
          const validRoles = ['user', 'moderator', 'admin', 'super_admin'];
          if (!roles.every(role => validRoles.includes(role))) {
            throw new Error('มี role ที่ไม่ถูกต้อง');
          }
          return true;
        }),
      
      body('permissions')
        .optional()
        .isArray()
        .withMessage('permissions ต้องเป็น array')
        .custom((permissions) => {
          const validPermissions = [
            'read:users', 'write:users', 'delete:users',
            'read:products', 'write:products', 'delete:products',
            'read:orders', 'write:orders', 'delete:orders',
            'read:reports', 'write:reports',
            'manage:system', 'manage:users', 'manage:roles'
          ];
          if (!permissions.every(permission => validPermissions.includes(permission))) {
            throw new Error('มี permission ที่ไม่ถูกต้อง');
          }
          return true;
        }),
      
      body('status')
        .optional()
        .isIn(['active', 'inactive', 'suspended', 'pending'])
        .withMessage('สถานะไม่ถูกต้อง'),
      
      body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('เหตุผลต้องไม่เกิน 500 ตัวอักษร')
    ];
  }
  
  /**
   * Validation สำหรับการค้นหาผู้ใช้
   */
  userSearch() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('หน้าต้องเป็นตัวเลขที่มากกว่า 0'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('จำนวนต่อหน้าต้องเป็น 1-100'),
      
      query('search')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('คำค้นหาต้องมี 2-50 ตัวอักษร'),
      
      query('role')
        .optional()
        .isIn(['user', 'moderator', 'admin', 'super_admin'])
        .withMessage('role ไม่ถูกต้อง'),
      
      query('status')
        .optional()
        .isIn(['active', 'inactive', 'suspended', 'pending'])
        .withMessage('สถานะไม่ถูกต้อง'),
      
      query('sort')
        .optional()
        .isIn(['createdAt', '-createdAt', 'lastLogin', '-lastLogin', 'username', '-username'])
        .withMessage('การเรียงลำดับไม่ถูกต้อง')
    ];
  }
  
  /**
   * Validation สำหรับ Refresh Token
   */
  refreshToken() {
    return [
      body('refreshToken')
        .notEmpty()
        .withMessage('กรุณาระบุ Refresh Token')
        .isLength({ min: 40 })
        .withMessage('Refresh Token ไม่ถูกต้อง')
    ];
  }
  
  /**
   * Validation สำหรับการขอรีเซ็ตรหัสผ่าน
   */
  forgotPassword() {
    return [
      body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('รูปแบบอีเมลไม่ถูกต้อง')
    ];
  }
  
  /**
   * Custom validator สำหรับตรวจสอบความแข็งแกร่งของรหัสผ่าน
   */
  passwordStrength(score = 2) {
    return (value) => {
      const result = zxcvbn(value);
      if (result.score < score) {
        const suggestions = result.feedback.suggestions.join(' ');
        throw new Error(`รหัสผ่านไม่ปลอดภัยพอ: ${suggestions || 'กรุณาใช้รหัสผ่านที่ซับซ้อนมากขึ้น'}`);
      }
      return true;
    };
  }
  
  /**
   * Sanitize HTML content
   */
  sanitizeHtml() {
    return [
      body('*')
        .customSanitizer(value => {
          if (typeof value === 'string') {
            // ลบ HTML tags ที่อันตราย
            return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                       .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                       .replace(/javascript:/gi, '')
                       .replace(/on\w+\s*=/gi, '');
          }
          return value;
        })
    ];
  }
}

module.exports = new ValidationMiddleware();