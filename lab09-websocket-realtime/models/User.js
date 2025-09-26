/**
 * User Model - โมเดลผู้ใช้สำหรับ Real-time App
 * รองรับ online status, last seen, และ socket management
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'ชื่อผู้ใช้จำเป็น'],
    unique: true,
    trim: true,
    minlength: [3, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'],
    maxlength: [30, 'ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร'],
    match: [/^[a-zA-Z0-9_]+$/, 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, A-Z, 0-9, และ _']
  },
  
  email: {
    type: String,
    required: [true, 'อีเมลจำเป็น'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'รูปแบบอีเมลไม่ถูกต้อง'
    ]
  },
  
  password: {
    type: String,
    required: [true, 'รหัสผ่านจำเป็น'],
    minlength: [6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร']
  },
  
  // Profile Information
  firstName: {
    type: String,
    required: [true, 'ชื่อจริงจำเป็น'],
    trim: true,
    maxlength: [50, 'ชื่อต้องไม่เกิน 50 ตัวอักษร']
  },
  
  lastName: {
    type: String,
    required: [true, 'นามสกุลจำเป็น'],
    trim: true,
    maxlength: [50, 'นามสกุลต้องไม่เกิน 50 ตัวอักษร']
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  bio: {
    type: String,
    maxlength: [200, 'คำอธิบายต้องไม่เกิน 200 ตัวอักษร'],
    default: ''
  },
  
  // Status & Activity
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  isOnline: {
    type: Boolean,
    default: false
  },
  
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  // Socket Management
  socketIds: [{
    type: String
  }],
  
  currentSockets: {
    type: Number,
    default: 0
  },
  
  // Chat Related
  joinedRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  
  // Notification Settings
  notificationSettings: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    sound: {
      type: Boolean,
      default: true
    },
    mentions: {
      type: Boolean,
      default: true
    },
    directMessages: {
      type: Boolean,
      default: true
    }
  },
  
  // Privacy Settings
  privacySettings: {
    showOnlineStatus: {
      type: Boolean,
      default: true
    },
    showLastSeen: {
      type: Boolean,
      default: true
    },
    allowDirectMessages: {
      type: Boolean,
      default: true
    }
  },
  
  // Roles and Permissions
  roles: [{
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  }],
  
  // Statistics
  stats: {
    messagesSent: {
      type: Number,
      default: 0
    },
    messagesReceived: {
      type: Number,
      default: 0
    },
    roomsJoined: {
      type: Number,
      default: 0
    },
    totalOnlineTime: {
      type: Number,
      default: 0
    }
  },
  
  // Account Information
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Timestamps
  lastLogin: Date,
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual Properties
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

userSchema.virtual('onlineStatus').get(function() {
  if (!this.privacySettings.showOnlineStatus) return 'hidden';
  return this.isOnline ? 'online' : 'offline';
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ lastSeen: 1 });
userSchema.index({ 'stats.messagesSent': 1 });
userSchema.index({ createdAt: 1 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password เมื่อมีการเปลี่ยนแปลง
  if (this.isModified('password')) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
  
  // อัพเดท lastActivity
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  
  next();
});

// Instance Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function() {
  const payload = {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    roles: this.roles
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

userSchema.methods.generateRefreshToken = function() {
  const payload = {
    id: this._id.toString(),
    type: 'refresh'
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Socket Management Methods
userSchema.methods.addSocket = function(socketId) {
  if (!this.socketIds.includes(socketId)) {
    this.socketIds.push(socketId);
    this.currentSockets = this.socketIds.length;
    
    // Set online if first socket
    if (this.currentSockets === 1) {
      this.isOnline = true;
    }
  }
  return this.save();
};

userSchema.methods.removeSocket = function(socketId) {
  this.socketIds = this.socketIds.filter(id => id !== socketId);
  this.currentSockets = this.socketIds.length;
  
  // Set offline if no sockets left
  if (this.currentSockets === 0) {
    this.isOnline = false;
    this.lastSeen = new Date();
  }
  
  return this.save();
};

userSchema.methods.setOnline = function(socketId) {
  this.isOnline = true;
  this.lastActivity = new Date();
  
  if (socketId) {
    return this.addSocket(socketId);
  }
  
  return this.save();
};

userSchema.methods.setOffline = function(socketId) {
  if (socketId) {
    return this.removeSocket(socketId);
  } else {
    this.isOnline = false;
    this.lastSeen = new Date();
    this.socketIds = [];
    this.currentSockets = 0;
    return this.save();
  }
};

// Activity Methods
userSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

userSchema.methods.incrementMessagesSent = function() {
  this.stats.messagesSent += 1;
  return this.save();
};

userSchema.methods.incrementMessagesReceived = function() {
  this.stats.messagesReceived += 1;
  return this.save();
};

// Static Methods
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: { $regex: new RegExp(username, 'i') } });
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findOnlineUsers = function(limit = 50) {
  return this.find({ isOnline: true })
    .select('username firstName lastName avatar lastSeen')
    .limit(limit)
    .sort({ lastActivity: -1 });
};

userSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        onlineUsers: { $sum: { $cond: [{ $eq: ['$isOnline', true] }, 1, 0] } },
        totalMessages: { $sum: '$stats.messagesSent' }
      }
    }
  ]);
};

userSchema.statics.getTopActiveUsers = function(limit = 10) {
  return this.find({ status: 'active' })
    .select('username firstName lastName avatar stats')
    .sort({ 'stats.messagesSent': -1 })
    .limit(limit);
};

userSchema.statics.cleanupOfflineUsers = async function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const result = await this.updateMany(
    {
      isOnline: true,
      lastActivity: { $lt: oneHourAgo }
    },
    {
      $set: {
        isOnline: false,
        lastSeen: new Date(),
        socketIds: [],
        currentSockets: 0
      }
    }
  );
  
  return result;
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.socketIds;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);