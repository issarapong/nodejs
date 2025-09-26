/**
 * Room Model - โมเดลห้องแชท
 * รองรับ private chat, group chat, และการจัดการสมาชิก
 */

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'ชื่อห้องจำเป็น'],
    trim: true,
    maxlength: [100, 'ชื่อห้องต้องไม่เกิน 100 ตัวอักษร']
  },
  
  description: {
    type: String,
    maxlength: [500, 'คำอธิบายต้องไม่เกิน 500 ตัวอักษร'],
    default: ''
  },
  
  // Room Type
  type: {
    type: String,
    enum: ['private', 'group', 'public', 'channel'],
    default: 'group',
    required: true
  },
  
  // Room Privacy
  isPrivate: {
    type: Boolean,
    default: false
  },
  
  // Room Status
  status: {
    type: String,
    enum: ['active', 'archived', 'suspended'],
    default: 'active'
  },
  
  // Room Creator/Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Room Members
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    permissions: [{
      type: String,
      enum: [
        'send_message',
        'upload_file',
        'delete_message',
        'kick_member',
        'ban_member',
        'edit_room',
        'invite_member'
      ]
    }],
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Room Settings
  settings: {
    maxMembers: {
      type: Number,
      default: 100,
      max: [1000, 'จำนวนสมาชิกสูงสุดไม่เกิน 1000 คน']
    },
    allowFileUpload: {
      type: Boolean,
      default: true
    },
    allowInvites: {
      type: Boolean,
      default: true
    },
    messageRetention: {
      type: Number,
      default: 30 // วัน
    },
    slowMode: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: Number,
        default: 0 // วินาที
      }
    }
  },
  
  // Room Avatar/Icon
  avatar: {
    type: String,
    default: null
  },
  
  // Room Tags/Categories
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Room Statistics
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 0
    },
    activeMembers: {
      type: Number,
      default: 0
    },
    filesShared: {
      type: Number,
      default: 0
    }
  },
  
  // Last Activity
  lastMessage: {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Room Permissions
  defaultPermissions: [{
    type: String,
    enum: [
      'send_message',
      'upload_file',
      'delete_message',
      'kick_member',
      'ban_member',
      'edit_room',
      'invite_member'
    ],
    default: ['send_message']
  }],
  
  // Banned Users
  bannedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    bannedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date
  }],
  
  // Room Invitations
  invitations: [{
    email: String,
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    token: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      default: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 วัน
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual Properties
roomSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

roomSchema.virtual('onlineCount').get(function() {
  return this.members.filter(member => member.isOnline).length;
});

roomSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

roomSchema.virtual('canJoin').get(function() {
  return this.status === 'active' && 
         this.members.length < this.settings.maxMembers;
});

// Indexes
roomSchema.index({ name: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ owner: 1 });
roomSchema.index({ 'members.user': 1 });
roomSchema.index({ tags: 1 });
roomSchema.index({ createdAt: -1 });
roomSchema.index({ 'lastMessage.timestamp': -1 });
roomSchema.index({ 'stats.totalMessages': -1 });

// Pre-save middleware
roomSchema.pre('save', function(next) {
  // อัพเดท stats
  this.stats.totalMembers = this.members.length;
  this.stats.activeMembers = this.members.filter(m => m.isOnline).length;
  
  next();
});

// Instance Methods

// Member Management
roomSchema.methods.addMember = function(userId, role = 'member', permissions = ['send_message']) {
  // ตรวจสอบว่าเป็นสมาชิกอยู่แล้วหรือไม่
  const existingMember = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('ผู้ใช้เป็นสมาชิกของห้องนี้อยู่แล้ว');
  }
  
  // ตรวจสอบจำนวนสมาชิกสูงสุด
  if (this.members.length >= this.settings.maxMembers) {
    throw new Error('ห้องเต็มแล้ว ไม่สามารถเพิ่มสมาชิกได้');
  }
  
  this.members.push({
    user: userId,
    role: role,
    permissions: permissions,
    joinedAt: new Date(),
    isOnline: false
  });
  
  return this.save();
};

roomSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(
    member => member.user.toString() !== userId.toString()
  );
  return this.save();
};

roomSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (!member) {
    throw new Error('ไม่พบสมาชิกในห้องนี้');
  }
  
  member.role = newRole;
  return this.save();
};

roomSchema.methods.updateMemberOnlineStatus = function(userId, isOnline) {
  const member = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (member) {
    member.isOnline = isOnline;
    if (!isOnline) {
      member.lastSeen = new Date();
    }
    return this.save();
  }
  
  return Promise.resolve(this);
};

roomSchema.methods.isMember = function(userId) {
  return this.members.some(
    member => member.user.toString() === userId.toString()
  );
};

roomSchema.methods.getMember = function(userId) {
  return this.members.find(
    member => member.user.toString() === userId.toString()
  );
};

roomSchema.methods.getMemberRole = function(userId) {
  const member = this.getMember(userId);
  return member ? member.role : null;
};

roomSchema.methods.hasPermission = function(userId, permission) {
  const member = this.getMember(userId);
  if (!member) return false;
  
  // Owner มีสิทธิ์ทุกอย่าง
  if (this.owner.toString() === userId.toString()) return true;
  
  // Admin และ Moderator มีสิทธิ์พิเศษ
  if (member.role === 'admin') return true;
  if (member.role === 'moderator' && permission !== 'edit_room') return true;
  
  return member.permissions.includes(permission);
};

// Ban Management
roomSchema.methods.banUser = function(userId, bannedBy, reason, duration) {
  // ลบออกจากสมาชิก
  this.removeMember(userId);
  
  // เพิ่มใน banned list
  const banExpiry = duration ? new Date(Date.now() + duration) : null;
  
  this.bannedUsers.push({
    user: userId,
    bannedBy: bannedBy,
    reason: reason,
    expiresAt: banExpiry
  });
  
  return this.save();
};

roomSchema.methods.unbanUser = function(userId) {
  this.bannedUsers = this.bannedUsers.filter(
    ban => ban.user.toString() !== userId.toString()
  );
  return this.save();
};

roomSchema.methods.isBanned = function(userId) {
  const ban = this.bannedUsers.find(
    ban => ban.user.toString() === userId.toString()
  );
  
  if (!ban) return false;
  
  // ตรวจสอบว่าแบนหมดอายุหรือยัง
  if (ban.expiresAt && ban.expiresAt < new Date()) {
    this.unbanUser(userId);
    return false;
  }
  
  return true;
};

// Message Statistics
roomSchema.methods.incrementMessageCount = function() {
  this.stats.totalMessages += 1;
  this.lastMessage.timestamp = new Date();
  return this.save();
};

roomSchema.methods.updateLastMessage = function(messageId, senderId) {
  this.lastMessage.message = messageId;
  this.lastMessage.sender = senderId;
  this.lastMessage.timestamp = new Date();
  this.incrementMessageCount();
};

// Static Methods
roomSchema.statics.findByName = function(name) {
  return this.findOne({ name: { $regex: new RegExp(name, 'i') } });
};

roomSchema.statics.findPublicRooms = function(limit = 20) {
  return this.find({ 
    type: { $in: ['public', 'group'] },
    isPrivate: false,
    status: 'active'
  })
  .populate('owner', 'username firstName lastName avatar')
  .sort({ 'stats.totalMessages': -1 })
  .limit(limit);
};

roomSchema.statics.findUserRooms = function(userId, limit = 50) {
  return this.find({
    'members.user': userId,
    status: 'active'
  })
  .populate('owner', 'username firstName lastName avatar')
  .populate('members.user', 'username firstName lastName avatar isOnline')
  .sort({ 'lastMessage.timestamp': -1 })
  .limit(limit);
};

roomSchema.statics.getRoomStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalRooms: { $sum: 1 },
        activeRooms: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        publicRooms: { $sum: { $cond: [{ $eq: ['$isPrivate', false] }, 1, 0] } },
        totalMessages: { $sum: '$stats.totalMessages' },
        totalMembers: { $sum: '$stats.totalMembers' }
      }
    }
  ]);
};

roomSchema.statics.getPopularRooms = function(limit = 10) {
  return this.find({ 
    status: 'active',
    isPrivate: false
  })
  .populate('owner', 'username firstName lastName avatar')
  .sort({ 'stats.totalMessages': -1, 'stats.totalMembers': -1 })
  .limit(limit);
};

roomSchema.statics.searchRooms = function(query, limit = 20) {
  return this.find({
    $and: [
      { status: 'active' },
      { isPrivate: false },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  })
  .populate('owner', 'username firstName lastName avatar')
  .sort({ 'stats.totalMessages': -1 })
  .limit(limit);
};

module.exports = mongoose.model('Room', roomSchema);