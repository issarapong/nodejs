/**
 * User Controller - จัดการ CRUD operations สำหรับผู้ใช้
 * รวมถึงการสมัครสมาชิก การเข้าสู่ระบบ และการจัดการข้อมูลผู้ใช้
 */

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserController {
  /**
   * ลงทะเบียนผู้ใช้ใหม่
   * POST /api/users/register
   */
  static async register(req, res) {
    try {
      const {
        username,
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth
      } = req.body;

      // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
      const existingUser = await User.findByUsernameOrEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email หรือ Username นี้มีอยู่แล้วในระบบ',
          error: 'USER_ALREADY_EXISTS'
        });
      }

      // สร้างผู้ใช้ใหม่
      const newUser = new User({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
      });

      // บันทึกลงฐานข้อมูล
      await newUser.save();

      // สร้าง JWT token
      const token = newUser.generateAuthToken();
      const refreshToken = newUser.generateRefreshToken();

      // ส่งผลลัพธ์กลับ (ไม่รวมรหัสผ่าน)
      const userResponse = newUser.toJSON();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        message: 'ลงทะเบียนสำเร็จ!',
        data: {
          user: userResponse,
          token,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });

      console.log(`✅ ผู้ใช้ใหม่ลงทะเบียน: ${username} (${email})`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการลงทะเบียน:', error);

      // จัดการข้อผิดพลาด validation
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors
        });
      }

      // จัดการข้อผิดพลาด duplicate key
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} นี้มีอยู่แล้วในระบบ`,
          error: 'DUPLICATE_KEY'
        });
      }

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * เข้าสู่ระบบ
   * POST /api/users/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอก Email และ Password',
          error: 'MISSING_CREDENTIALS'
        });
      }

      // ค้นหาผู้ใช้และดึงรหัสผ่านมาด้วย
      const user = await User.findByUsernameOrEmail(email).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email หรือ Password ไม่ถูกต้อง',
          error: 'INVALID_CREDENTIALS'
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

      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email หรือ Password ไม่ถูกต้อง',
          error: 'INVALID_CREDENTIALS'
        });
      }

      // อัปเดตข้อมูลการเข้าสู่ระบบ
      await user.updateLoginInfo();

      // สร้าง tokens
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // ส่งผลลัพธ์กลับ
      const userResponse = user.toJSON();
      delete userResponse.password;

      res.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ!',
        data: {
          user: userResponse,
          token,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });

      console.log(`🔐 ผู้ใช้เข้าสู่ระบบ: ${user.username} (${user.email})`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการเข้าสู่ระบบ:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ดูข้อมูลผู้ใช้ปัจจุบัน
   * GET /api/users/profile
   */
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้',
          error: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * แก้ไขข้อมูลผู้ใช้
   * PUT /api/users/profile
   */
  static async updateProfile(req, res) {
    try {
      const allowedUpdates = [
        'firstName', 
        'lastName', 
        'phoneNumber', 
        'dateOfBirth',
        'avatar',
        'preferences'
      ];

      // กรองเฉพาะฟิลด์ที่อนุญาต
      const updates = {};
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      // อัปเดตข้อมูล
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้',
          error: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'อัปเดตข้อมูลสำเร็จ',
        data: {
          user: user.toJSON()
        }
      });

      console.log(`📝 อัปเดตข้อมูลผู้ใช้: ${user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดตข้อมูล:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * เปลี่ยนรหัสผ่าน
   * PUT /api/users/change-password
   */
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่',
          error: 'MISSING_PASSWORDS'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร',
          error: 'PASSWORD_TOO_SHORT'
        });
      }

      // ดึงข้อมูลผู้ใช้พร้อมรหัสผ่าน
      const user = await User.findById(req.user.id).select('+password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้',
          error: 'USER_NOT_FOUND'
        });
      }

      // ตรวจสอบรหัสผ่านเดิม
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'รหัสผ่านเดิมไม่ถูกต้อง',
          error: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // อัปเดตรหัสผ่านใหม่
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ'
      });

      console.log(`🔐 เปลี่ยนรหัสผ่าน: ${user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * จัดการที่อยู่ - เพิ่มที่อยู่ใหม่
   * POST /api/users/addresses
   */
  static async addAddress(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้',
          error: 'USER_NOT_FOUND'
        });
      }

      await user.addAddress(req.body);

      res.json({
        success: true,
        message: 'เพิ่มที่อยู่สำเร็จ',
        data: {
          addresses: user.addresses
        }
      });

      console.log(`📍 เพิ่มที่อยู่ใหม่: ${user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการเพิ่มที่อยู่:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ลบที่อยู่
   * DELETE /api/users/addresses/:addressId
   */
  static async removeAddress(req, res) {
    try {
      const { addressId } = req.params;
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้',
          error: 'USER_NOT_FOUND'
        });
      }

      await user.removeAddress(addressId);

      res.json({
        success: true,
        message: 'ลบที่อยู่สำเร็จ',
        data: {
          addresses: user.addresses
        }
      });

      console.log(`🗑️ ลบที่อยู่: ${user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการลบที่อยู่:', error);

      if (error.message === 'ไม่พบที่อยู่ที่ต้องการลบ') {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: 'ADDRESS_NOT_FOUND'
        });
      }

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  // Admin Methods

  /**
   * ดูรายการผู้ใช้ทั้งหมด (Admin เท่านั้น)
   * GET /api/users
   */
  static async getAllUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        role = '', 
        isActive 
      } = req.query;

      // สร้าง query filters
      const filters = {};
      
      if (search) {
        filters.$or = [
          { username: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { firstName: new RegExp(search, 'i') },
          { lastName: new RegExp(search, 'i') }
        ];
      }

      if (role) {
        filters.role = role;
      }

      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      // ดำเนินการ query
      const users = await User.find(filters)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const totalUsers = await User.countDocuments(filters);
      const totalPages = Math.ceil(totalUsers / limit);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalUsers,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงรายการผู้ใช้:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ดูข้อมูลผู้ใช้รายเดียว (Admin เท่านั้น)
   * GET /api/users/:id
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id)
        .select('-password -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้',
          error: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * สถิติผู้ใช้ (Admin เท่านั้น)
   * GET /api/users/stats
   */
  static async getUserStats(req, res) {
    try {
      const stats = await User.getStats();
      const recentUsers = await User.getRecentlyActiveUsers(5);

      res.json({
        success: true,
        data: {
          stats,
          recentUsers
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงสถิติผู้ใช้:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * อัปเดตบทบาทผู้ใช้ (Admin เท่านั้น)
   * PUT /api/users/:id/role
   */
  static async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'บทบาทไม่ถูกต้อง',
          error: 'INVALID_ROLE'
        });
      }

      const user = await User.findByIdAndUpdate(
        id,
        { role, updatedAt: new Date() },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้',
          error: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'อัปเดตบทบาทสำเร็จ',
        data: { user }
      });

      console.log(`👑 อัปเดตบทบาท: ${user.username} -> ${role}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดตบทบาท:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }
}

module.exports = UserController;