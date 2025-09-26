/**
 * User Routes - เส้นทาง API สำหรับการจัดการผู้ใช้
 * /api/users/*
 */

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { auth, adminAuth } = require('../middleware/auth');
const { validateUser, validateLogin, validatePasswordChange } = require('../middleware/validation');

// ==================== Public Routes ====================

/**
 * ลงทะเบียนผู้ใช้ใหม่
 * POST /api/users/register
 */
router.post('/register', validateUser, UserController.register);

/**
 * เข้าสู่ระบบ
 * POST /api/users/login
 */
router.post('/login', validateLogin, UserController.login);

// ==================== Protected Routes (ต้อง Login) ====================

/**
 * ดูข้อมูลผู้ใช้ปัจจุบัน
 * GET /api/users/profile
 */
router.get('/profile', auth, UserController.getProfile);

/**
 * แก้ไขข้อมูลผู้ใช้
 * PUT /api/users/profile
 */
router.put('/profile', auth, UserController.updateProfile);

/**
 * เปลี่ยนรหัสผ่าน
 * PUT /api/users/change-password
 */
router.put('/change-password', auth, validatePasswordChange, UserController.changePassword);

/**
 * เพิ่มที่อยู่ใหม่
 * POST /api/users/addresses
 */
router.post('/addresses', auth, UserController.addAddress);

/**
 * ลบที่อยู่
 * DELETE /api/users/addresses/:addressId
 */
router.delete('/addresses/:addressId', auth, UserController.removeAddress);

// ==================== Admin Routes (ต้อง Login + Admin) ====================

/**
 * ดูรายการผู้ใช้ทั้งหมด (Admin เท่านั้น)
 * GET /api/users?page=1&limit=10&search=keyword&role=user&isActive=true
 */
router.get('/', auth, adminAuth, UserController.getAllUsers);

/**
 * สถิติผู้ใช้ (Admin เท่านั้น)
 * GET /api/users/stats
 */
router.get('/stats', auth, adminAuth, UserController.getUserStats);

/**
 * ดูข้อมูลผู้ใช้รายเดียว (Admin เท่านั้น)
 * GET /api/users/:id
 */
router.get('/:id', auth, adminAuth, UserController.getUserById);

/**
 * อัปเดตบทบาทผู้ใช้ (Admin เท่านั้น)
 * PUT /api/users/:id/role
 */
router.put('/:id/role', auth, adminAuth, UserController.updateUserRole);

module.exports = router;