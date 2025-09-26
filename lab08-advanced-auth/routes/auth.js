/**
 * Routes - Authentication & Authorization
 * เส้นทาง API สำหรับ Authentication และ Authorization
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const mfaController = require('../controllers/mfaController');
const oauthController = require('../controllers/oauthController');

// Middleware
const auth = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');
const validation = require('../middleware/validation');

// ===========================================
// Public Routes (ไม่ต้องเข้าสู่ระบบ)
// ===========================================

/**
 * @route   POST /api/auth/register
 * @desc    สมัครสมาชิก
 * @access  Public
 */
router.post('/register', 
  rateLimitMiddleware.register(),
  validation.register(),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    เข้าสู่ระบบ
 * @access  Public
 */
router.post('/login', 
  rateLimitMiddleware.login(),
  rateLimitMiddleware.loginSlowDown(),
  rateLimitMiddleware.progressiveUserLimit(),
  validation.login(),
  authController.login
);

/**
 * @route   POST /api/auth/mfa/verify
 * @desc    ยืนยัน MFA Token
 * @access  Public (แต่ต้องมี temp token)
 */
router.post('/mfa/verify',
  rateLimitMiddleware.mfa(),
  validation.mfaToken(),
  authController.verifyMFA
);

/**
 * @route   POST /api/auth/refresh
 * @desc    ต่ออายุ Access Token
 * @access  Public
 */
router.post('/refresh',
  rateLimitMiddleware.general(),
  validation.refreshToken(),
  authController.refreshToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    ขอรีเซ็ตรหัสผ่าน
 * @access  Public
 */
router.post('/forgot-password',
  rateLimitMiddleware.passwordReset(),
  validation.forgotPassword(),
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    รีเซ็ตรหัสผ่าน
 * @access  Public
 */
router.post('/reset-password',
  rateLimitMiddleware.sensitive(),
  validation.resetPassword(),
  authController.resetPassword
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    ยืนยันอีเมล
 * @access  Public
 */
router.get('/verify-email/:token',
  rateLimitMiddleware.general(),
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    ส่งอีเมลยืนยันใหม่
 * @access  Public
 */
router.post('/resend-verification',
  rateLimitMiddleware.emailVerification(),
  validation.forgotPassword(), // ใช้ validation เดียวกัน (email only)
  authController.resendVerification
);

// ===========================================
// OAuth Routes
// ===========================================

/**
 * @route   GET /api/auth/google
 * @desc    เข้าสู่ระบบด้วย Google
 * @access  Public
 */
router.get('/google', oauthController.googleAuth);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth Callback
 * @access  Public
 */
router.get('/google/callback', oauthController.googleCallback);

/**
 * @route   GET /api/auth/facebook
 * @desc    เข้าสู่ระบบด้วย Facebook
 * @access  Public
 */
router.get('/facebook', oauthController.facebookAuth);

/**
 * @route   GET /api/auth/facebook/callback
 * @desc    Facebook OAuth Callback
 * @access  Public
 */
router.get('/facebook/callback', oauthController.facebookCallback);

// ===========================================
// Protected Routes (ต้องเข้าสู่ระบบ)
// ===========================================

/**
 * @route   POST /api/auth/logout
 * @desc    ออกจากระบบ
 * @access  Private
 */
router.post('/logout',
  auth.authenticate,
  authController.logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    ออกจากระบบทุกอุปกรณ์
 * @access  Private
 */
router.post('/logout-all',
  auth.authenticate,
  rateLimitMiddleware.sensitive(),
  authController.logoutAll
);

/**
 * @route   POST /api/auth/change-password
 * @desc    เปลี่ยนรหัสผ่าน
 * @access  Private
 */
router.post('/change-password',
  auth.authenticate,
  auth.requireActiveAccount,
  rateLimitMiddleware.sensitive(),
  validation.changePassword(),
  authController.changePassword
);

/**
 * @route   GET /api/auth/profile
 * @desc    ดูข้อมูลโปรไฟล์
 * @access  Private
 */
router.get('/profile',
  auth.authenticate,
  authController.getProfile
);

/**
 * @route   GET /api/auth/devices
 * @desc    ดูอุปกรณ์ที่เข้าสู่ระบบ
 * @access  Private
 */
router.get('/devices',
  auth.authenticate,
  authController.getDevices
);

/**
 * @route   DELETE /api/auth/devices/:deviceId
 * @desc    ออกจากระบบอุปกรณ์เฉพาะ
 * @access  Private
 */
router.delete('/devices/:deviceId',
  auth.authenticate,
  rateLimitMiddleware.sensitive(),
  authController.revokeDevice
);

// ===========================================
// MFA Routes (ต้องเข้าสู่ระบบ)
// ===========================================

/**
 * @route   GET /api/auth/mfa/status
 * @desc    ดูสถานะ MFA
 * @access  Private
 */
router.get('/mfa/status',
  auth.authenticate,
  mfaController.getMFAStatus
);

/**
 * @route   POST /api/auth/mfa/enable
 * @desc    เปิดใช้งาน MFA (ขั้นตอนที่ 1)
 * @access  Private
 */
router.post('/mfa/enable',
  auth.authenticate,
  auth.requireActiveAccount,
  auth.requireEmailVerified,
  rateLimitMiddleware.mfa(),
  mfaController.enableMFA
);

/**
 * @route   POST /api/auth/mfa/verify-setup
 * @desc    ยืนยันการตั้งค่า MFA (ขั้นตอนที่ 2)
 * @access  Private
 */
router.post('/mfa/verify-setup',
  auth.authenticate,
  auth.requireActiveAccount,
  rateLimitMiddleware.mfa(),
  validation.mfaToken(),
  mfaController.verifyMFASetup
);

/**
 * @route   POST /api/auth/mfa/disable
 * @desc    ปิดใช้งาน MFA
 * @access  Private
 */
router.post('/mfa/disable',
  auth.authenticate,
  auth.requireActiveAccount,
  rateLimitMiddleware.sensitive(),
  validation.mfaToken(),
  mfaController.disableMFA
);

/**
 * @route   POST /api/auth/mfa/regenerate-backup-codes
 * @desc    สร้างรหัสสำรองใหม่
 * @access  Private
 */
router.post('/mfa/regenerate-backup-codes',
  auth.authenticate,
  auth.requireActiveAccount,
  rateLimitMiddleware.sensitive(),
  validation.mfaToken(),
  mfaController.regenerateBackupCodes
);

// ===========================================
// OAuth Account Management (ต้องเข้าสู่ระบบ)
// ===========================================

/**
 * @route   GET /api/auth/oauth/status
 * @desc    ดูสถานะการเชื่อมต่อ OAuth
 * @access  Private
 */
router.get('/oauth/status',
  auth.authenticate,
  oauthController.getOAuthStatus
);

/**
 * @route   POST /api/auth/oauth/:provider/link
 * @desc    เชื่อมต่อบัญชี OAuth
 * @access  Private
 */
router.post('/oauth/:provider/link',
  auth.authenticate,
  auth.requireActiveAccount,
  rateLimitMiddleware.sensitive(),
  oauthController.linkAccount
);

/**
 * @route   DELETE /api/auth/oauth/:provider/unlink
 * @desc    ยกเลิกการเชื่อมต่อบัญชี OAuth
 * @access  Private
 */
router.delete('/oauth/:provider/unlink',
  auth.authenticate,
  auth.requireActiveAccount,
  rateLimitMiddleware.sensitive(),
  oauthController.unlinkAccount
);

// ===========================================
// Health Check
// ===========================================

/**
 * @route   GET /api/auth/health
 * @desc    ตรวจสอบสถานะ API
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;