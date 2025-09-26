/**
 * RefreshToken Model - สำหรับจัดการ Refresh Tokens
 * โมเดลสำหรับเก็บ Refresh Token และจัดการ Token Rotation
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Device Information
  deviceId: {
    type: String,
    required: true
  },
  deviceInfo: mongoose.Schema.Types.Mixed,
  
  // Location Information
  ipAddress: String,
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  
  // Token Status
  isActive: {
    type: Boolean,
    default: true
  },
  revokedAt: Date,
  revokedBy: String, // user, admin, system
  revokedReason: String,
  
  // Security
  family: String, // Token family สำหรับ token rotation
  parentToken: String, // Token ที่ใช้สร้าง token นี้
  
  // Expiration
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB จะลบ document อัตโนมัติเมื่อหมดอายุ
  },
  
  // Usage Statistics
  lastUsed: {
    type: Date,
    default: Date.now
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ user: 1 });
refreshTokenSchema.index({ deviceId: 1 });
refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
refreshTokenSchema.index({ isActive: 1, expiresAt: 1 });

// Instance Methods
refreshTokenSchema.methods.revoke = function(reason = 'manual', revokedBy = 'user') {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  this.revokedBy = revokedBy;
  return this.save();
};

refreshTokenSchema.methods.updateUsage = function(ipAddress, userAgent) {
  this.lastUsed = new Date();
  this.usageCount += 1;
  
  if (ipAddress) {
    this.ipAddress = ipAddress;
  }
  
  return this.save();
};

// Static Methods
refreshTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(40).toString('hex');
};

refreshTokenSchema.statics.createToken = async function(userId, deviceInfo, expiresIn = '7d') {
  // สร้าง token ใหม่
  const token = this.generateToken();
  
  // คำนวณวันหมดอายุ
  const expiresAt = new Date();
  const expireValue = parseInt(expiresIn.slice(0, -1));
  const expireUnit = expiresIn.slice(-1);
  
  switch (expireUnit) {
    case 'd':
      expiresAt.setDate(expiresAt.getDate() + expireValue);
      break;
    case 'h':
      expiresAt.setHours(expiresAt.getHours() + expireValue);
      break;
    case 'm':
      expiresAt.setMinutes(expiresAt.getMinutes() + expireValue);
      break;
    default:
      expiresAt.setDate(expiresAt.getDate() + 7); // default 7 วัน
  }
  
  // สร้าง family สำหรับ token rotation
  const family = crypto.randomBytes(16).toString('hex');
  
  const refreshToken = new this({
    token,
    user: userId,
    deviceId: deviceInfo.deviceId,
    deviceInfo: {
      name: deviceInfo.name,
      type: deviceInfo.type,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      userAgent: deviceInfo.userAgent
    },
    ipAddress: deviceInfo.ipAddress,
    location: deviceInfo.location,
    family,
    expiresAt
  });
  
  return await refreshToken.save();
};

refreshTokenSchema.statics.findValidToken = async function(token) {
  return await this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('user');
};

refreshTokenSchema.statics.revokeAllUserTokens = async function(userId, reason = 'logout_all') {
  return await this.updateMany(
    { user: userId, isActive: true },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
        revokedBy: 'user'
      }
    }
  );
};

refreshTokenSchema.statics.revokeDeviceTokens = async function(userId, deviceId, reason = 'device_logout') {
  return await this.updateMany(
    { user: userId, deviceId, isActive: true },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
        revokedBy: 'user'
      }
    }
  );
};

refreshTokenSchema.statics.revokeFamilyTokens = async function(family, reason = 'token_rotation') {
  return await this.updateMany(
    { family, isActive: true },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
        revokedBy: 'system'
      }
    }
  );
};

refreshTokenSchema.statics.cleanupExpiredTokens = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  console.log(`🧹 ลบ Refresh Token ที่หมดอายุ: ${result.deletedCount} tokens`);
  return result;
};

refreshTokenSchema.statics.getUserTokens = async function(userId, activeOnly = true) {
  const filter = { user: userId };
  if (activeOnly) {
    filter.isActive = true;
    filter.expiresAt = { $gt: new Date() };
  }
  
  return await this.find(filter)
    .sort({ lastUsed: -1 })
    .select('-token') // ไม่ส่ง token จริงกลับไป
    .populate('user', 'username email');
};

refreshTokenSchema.statics.rotateToken = async function(oldToken) {
  const oldTokenDoc = await this.findValidToken(oldToken);
  if (!oldTokenDoc) {
    throw new Error('Token ไม่ถูกต้องหรือหมดอายุ');
  }
  
  // สร้าง token ใหม่ในครอบครัวเดียวกัน
  const newToken = this.generateToken();
  const newTokenDoc = new this({
    token: newToken,
    user: oldTokenDoc.user,
    deviceId: oldTokenDoc.deviceId,
    deviceInfo: oldTokenDoc.deviceInfo,
    ipAddress: oldTokenDoc.ipAddress,
    location: oldTokenDoc.location,
    family: oldTokenDoc.family,
    parentToken: oldToken,
    expiresAt: oldTokenDoc.expiresAt
  });
  
  // บันทึก token ใหม่
  await newTokenDoc.save();
  
  // ยกเลิก token เก่า
  await oldTokenDoc.revoke('rotation', 'system');
  
  return newTokenDoc;
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);