/**
 * User Model - แบบจำลองข้อมูลผู้ใช้
 * จัดการข้อมูลผู้ใช้ การสมัครสมาชิก และการเข้าสู่ระบบ
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Schema สำหรับที่อยู่
const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  street: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    default: 'Thailand',
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

// หลัก User Schema
const userSchema = new mongoose.Schema({
  // ข้อมูลสำหรับการเข้าสู่ระบบ
  username: {
    type: String,
    required: [true, 'Username จำเป็นต้องกรอก'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username ต้องมีอย่างน้อย 3 ตัวอักษร'],
    maxlength: [30, 'Username ต้องมีไม่เกิน 30 ตัวอักษร'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username ใช้ได้เฉพาะตัวอักษร ตัวเลข และ underscore']
  },
  
  email: {
    type: String,
    required: [true, 'Email จำเป็นต้องกรอก'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'รูปแบบ Email ไม่ถูกต้อง']
  },
  
  password: {
    type: String,
    required: [true, 'Password จำเป็นต้องกรอก'],
    minlength: [6, 'Password ต้องมีอย่างน้อย 6 ตัวอักษร'],
    select: false // ไม่ส่งกลับใน query ปกติ
  },

  // ข้อมูลส่วนตัว
  firstName: {
    type: String,
    required: [true, 'ชื่อจำเป็นต้องกรอก'],
    trim: true,
    maxlength: [50, 'ชื่อต้องมีไม่เกิน 50 ตัวอักษร']
  },
  
  lastName: {
    type: String,
    required: [true, 'นามสกุลจำเป็นต้องกรอก'],
    trim: true,
    maxlength: [50, 'นามสกุลต้องมีไม่เกิน 50 ตัวอักษร']
  },
  
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[0-9-+\s()]+$/, 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง']
  },
  
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'วันเกิดไม่สามารถเป็นอนาคตได้'
    }
  },

  // รูปภาพโปรไฟล์
  avatar: {
    type: String,
    default: null
  },

  // ที่อยู่ (สามารถมีหลายที่อยู่)
  addresses: [addressSchema],

  // บทบาทและสิทธิ
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  // ข้อมูลการเข้าสู่ระบบ
  lastLogin: {
    type: Date,
    default: null
  },
  
  loginCount: {
    type: Number,
    default: 0
  },

  // Token สำหรับรีเซ็ตรหัสผ่าน
  resetPasswordToken: {
    type: String,
    select: false
  },
  
  resetPasswordExpires: {
    type: Date,
    select: false
  },

  // การตั้งค่าผู้ใช้
  preferences: {
    language: {
      type: String,
      enum: ['th', 'en'],
      default: 'th'
    },
    currency: {
      type: String,
      enum: ['THB', 'USD', 'EUR'],
      default: 'THB'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true, // เพิ่ม createdAt และ updatedAt อัตโนมัติ
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual field สำหรับชื่อเต็ม
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual field สำหรับอายุ
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual field สำหรับที่อยู่หลัก
userSchema.virtual('defaultAddress').get(function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0] || null;
});

// Indexes สำหรับการค้นหา
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware สำหรับเข้ารหัสรหัสผ่าน
userSchema.pre('save', async function(next) {
  // ถ้ารหัสผ่านไม่มีการเปลี่ยนแปลง ให้ข้ามไป
  if (!this.isModified('password')) return next();
  
  try {
    // เข้ารหัสรหัสผ่านด้วย bcrypt
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware สำหรับการจัดการที่อยู่หลัก
userSchema.pre('save', function(next) {
  // ถ้าไม่มีที่อยู่ไหนเป็นหลัก ให้ตัวแรกเป็นหลัก
  if (this.addresses.length > 0 && !this.addresses.some(addr => addr.isDefault)) {
    this.addresses[0].isDefault = true;
  }
  
  // ตรวจสอบให้มีที่อยู่หลักเพียงที่เดียว
  let defaultCount = 0;
  this.addresses.forEach((addr, index) => {
    if (addr.isDefault) {
      defaultCount++;
      if (defaultCount > 1) {
        addr.isDefault = false;
      }
    }
  });
  
  next();
});

// Instance methods

/**
 * ตรวจสอบรหัสผ่าน
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('ไม่มีรหัสผ่านสำหรับการเปรียบเทียบ');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * สร้าง JWT Token
 */
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'nodejs-lab-secret',
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'nodejs-lab'
    }
  );
};

/**
 * สร้าง Refresh Token
 */
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    id: this._id,
    type: 'refresh'
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'nodejs-lab-refresh-secret',
    { 
      expiresIn: '30d',
      issuer: 'nodejs-lab'
    }
  );
};

/**
 * สร้าง Token สำหรับรีเซ็ตรหัสผ่าน
 */
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Token หมดอายุใน 10 นาที
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

/**
 * อัปเดตข้อมูลการเข้าสู่ระบบ
 */
userSchema.methods.updateLoginInfo = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

/**
 * เพิ่มที่อยู่ใหม่
 */
userSchema.methods.addAddress = function(addressData) {
  // ถ้าเป็นที่อยู่แรก หรือ กำหนดให้เป็นหลัก
  if (this.addresses.length === 0 || addressData.isDefault) {
    // ยกเลิกการเป็นหลักของที่อยู่อื่น
    this.addresses.forEach(addr => addr.isDefault = false);
    addressData.isDefault = true;
  }
  
  this.addresses.push(addressData);
  return this.save();
};

/**
 * ลบที่อยู่
 */
userSchema.methods.removeAddress = function(addressId) {
  const addressIndex = this.addresses.findIndex(addr => addr._id.toString() === addressId);
  
  if (addressIndex === -1) {
    throw new Error('ไม่พบที่อยู่ที่ต้องการลบ');
  }
  
  const wasDefault = this.addresses[addressIndex].isDefault;
  this.addresses.splice(addressIndex, 1);
  
  // ถ้าลบที่อยู่หลักไป ให้ที่อยู่แรกเป็นหลักแทน
  if (wasDefault && this.addresses.length > 0) {
    this.addresses[0].isDefault = true;
  }
  
  return this.save();
};

// Static methods

/**
 * ค้นหาผู้ใช้ด้วย username หรือ email
 */
userSchema.statics.findByUsernameOrEmail = function(identifier) {
  return this.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { email: identifier.toLowerCase() }
    ]
  });
};

/**
 * สถิติผู้ใช้
 */
userSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
        },
        adminUsers: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    adminUsers: 0
  };
};

/**
 * ผู้ใช้ที่เข้าสู่ระบบล่าสุด
 */
userSchema.statics.getRecentlyActiveUsers = function(limit = 10) {
  return this.find({ lastLogin: { $ne: null } })
    .sort({ lastLogin: -1 })
    .limit(limit)
    .select('username email fullName lastLogin');
};

module.exports = mongoose.model('User', userSchema);