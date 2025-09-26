/**
 * User Model - Advanced Authentication
 * โมเดลผู้ใช้สำหรับระบบ Authentication ขั้นสูง
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // ข้อมูลพื้นฐาน
  username: {
    type: String,
    required: [true, 'กรุณาระบุชื่อผู้ใช้'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'],
    maxlength: [30, 'ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร'],
    match: [/^[a-zA-Z0-9_]+$/, 'ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _']
  },
  email: {
    type: String,
    required: [true, 'กรุณาระบุอีเมล'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'รูปแบบอีเมลไม่ถูกต้อง']
  },
  password: {
    type: String,
    required: [true, 'กรุณาระบุรหัสผ่าน'],
    minlength: [8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'],
    select: false // ไม่ส่งไปใน query ปกติ
  },
  
  // ข้อมูลส่วนตัว
  firstName: {
    type: String,
    required: [true, 'กรุณาระบุชื่อจริง'],
    trim: true,
    maxlength: [50, 'ชื่อจริงต้องไม่เกิน 50 ตัวอักษร']
  },
  lastName: {
    type: String,
    required: [true, 'กรุณาระบุนามสกุล'],
    trim: true,
    maxlength: [50, 'นามสกุลต้องไม่เกิน 50 ตัวอักษร']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก']
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Role และ Permission
  roles: [{
    type: String,
    enum: ['user', 'moderator', 'admin', 'super_admin'],
    default: 'user'
  }],
  permissions: [{
    type: String,
    enum: [
      'read:users', 'write:users', 'delete:users',
      'read:products', 'write:products', 'delete:products',
      'read:orders', 'write:orders', 'delete:orders',
      'read:reports', 'write:reports',
      'manage:system', 'manage:users', 'manage:roles'
    ]
  }],
  
  // Account Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Security Features
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Password Management
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordHistory: [{
    hash: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Multi-Factor Authentication (MFA)
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    select: false
  },
  mfaBackupCodes: [{
    code: String,
    used: { type: Boolean, default: false },
    usedAt: Date
  }],
  
  // OAuth Providers
  googleId: String,
  facebookId: String,
  
  // Login History
  lastLogin: Date,
  lastLoginIP: String,
  lastLoginUserAgent: String,
  
  // Device Management
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    userAgent: String,
    ipAddress: String,
    location: {
      country: String,
      city: String
    },
    lastUsed: Date,
    trusted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Settings
  preferences: {
    language: { type: String, default: 'th' },
    timezone: { type: String, default: 'Asia/Bangkok' },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    twoFactorAuth: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'trustedDevices.deviceId': 1 });

// Virtual Properties
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save Hooks
userSchema.pre('save', async function(next) {
  // Hash password ถ้ามีการเปลี่ยนแปลง
  if (!this.isModified('password')) return next();
  
  try {
    // เก็บประวัติรหัสผ่านเก่า
    if (this.password && !this.isNew) {
      this.passwordHistory.push({
        hash: this.password,
        createdAt: new Date()
      });
      
      // เก็บเฉพาะ 5 รหัสล่าสุด
      if (this.passwordHistory.length > 5) {
        this.passwordHistory = this.passwordHistory.slice(-5);
      }
    }
    
    // Hash รหัสผ่านใหม่
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000; // ลบ 1 วินาทีเพื่อให้แน่ใจว่า JWT ถูกสร้างหลังจากเปลี่ยนรหัส
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.checkPasswordHistory = async function(newPassword) {
  for (const oldPassword of this.passwordHistory) {
    if (await bcrypt.compare(newPassword, oldPassword.hash)) {
      return true; // รหัสผ่านซ้ำกับรหัสเก่า
    }
  }
  return false; // รหัสผ่านไม่ซ้ำ
};

userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      username: this.username,
      email: this.email,
      roles: this.roles,
      permissions: this.permissions
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
  );
};

userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id: this._id, tokenVersion: this.tokenVersion || 0 },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
  );
};

userSchema.methods.generateMFASecret = function() {
  const secret = speakeasy.generateSecret({
    name: `${process.env.MFA_SERVICE_NAME} (${this.email})`,
    issuer: process.env.MFA_ISSUER,
    length: 32
  });
  return secret;
};

userSchema.methods.verifyMFAToken = function(token) {
  return speakeasy.totp.verify({
    secret: this.mfaSecret,
    encoding: 'base32',
    token: token,
    window: 2 // อนุญาตให้ใช้ token ช่วง ±60 วินาที
  });
};

userSchema.methods.generateMFABackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  this.mfaBackupCodes = codes.map(code => ({ code }));
  return codes;
};

userSchema.methods.useBackupCode = function(code) {
  const backupCode = this.mfaBackupCodes.find(
    bc => bc.code === code.toUpperCase() && !bc.used
  );
  
  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    return true;
  }
  return false;
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 นาที
  return resetToken;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 ชั่วโมง
  return verificationToken;
};

userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

userSchema.methods.hasAnyRole = function(roles) {
  return roles.some(role => this.roles.includes(role));
};

userSchema.methods.hasAnyPermission = function(permissions) {
  return permissions.some(permission => this.permissions.includes(permission));
};

userSchema.methods.addTrustedDevice = function(deviceInfo) {
  const device = {
    deviceId: crypto.randomBytes(16).toString('hex'),
    deviceName: deviceInfo.deviceName || 'Unknown Device',
    userAgent: deviceInfo.userAgent,
    ipAddress: deviceInfo.ipAddress,
    location: deviceInfo.location || {},
    lastUsed: new Date(),
    trusted: false
  };
  
  this.trustedDevices.push(device);
  return device.deviceId;
};

userSchema.methods.updateLoginInfo = function(ipAddress, userAgent) {
  this.lastLogin = new Date();
  this.lastLoginIP = ipAddress;
  this.lastLoginUserAgent = userAgent;
  this.loginAttempts = 0; // รีเซ็ตจำนวนครั้งที่ล็อกอินผิด
  this.lockUntil = undefined;
};

userSchema.methods.incrementLoginAttempts = function() {
  // ถ้าอยู่ในช่วงล็อค และยังไม่หมดเวลา
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // ถ้าครบจำนวนครั้งสูงสุด และยังไม่ถูกล็อค
  if (this.loginAttempts + 1 >= (process.env.MAX_LOGIN_ATTEMPTS || 5) && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + (process.env.LOCK_TIME || 30) * 60 * 1000 // 30 นาที
    };
  }
  
  return this.updateOne(updates);
};

// Static Methods
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ 
    email: email.toLowerCase(),
    status: 'active' 
  }).select('+password');
  
  if (!user) {
    throw new Error('ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  
  if (user.isLocked) {
    throw new Error(`บัญชีถูกล็อค กรุณาลองใหม่ในอีก ${Math.round((user.lockUntil - Date.now()) / 60000)} นาที`);
  }
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw new Error('ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  
  return user;
};

userSchema.statics.findByToken = async function(token, tokenType = 'access') {
  try {
    const secret = tokenType === 'access' 
      ? process.env.JWT_ACCESS_SECRET 
      : process.env.JWT_REFRESH_SECRET;
      
    const decoded = jwt.verify(token, secret);
    const user = await this.findById(decoded.id);
    
    if (!user || user.status !== 'active') {
      throw new Error('ผู้ใช้ไม่ถูกต้องหรือบัญชีถูกปิดใช้งาน');
    }
    
    // ตรวจสอบว่ามีการเปลี่ยนรหัสผ่านหลังจากสร้าง token หรือไม่
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      throw new Error('รหัสผ่านถูกเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่');
    }
    
    return user;
  } catch (error) {
    throw new Error('Token ไม่ถูกต้องหรือหมดอายุ');
  }
};

module.exports = mongoose.model('User', userSchema);