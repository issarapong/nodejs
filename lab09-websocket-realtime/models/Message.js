/**
 * Message Model - โมเดลข้อความแชท
 * รองรับ text, image, file, emoji และ message types อื่นๆ
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Basic Message Info
  content: {
    type: String,
    required: function() {
      return this.type === 'text' || this.type === 'system';
    },
    maxlength: [1000, 'ข้อความต้องไม่เกิน 1000 ตัวอักษร']
  },
  
  // Message Type
  type: {
    type: String,
    enum: [
      'text',      // ข้อความธรรมดา
      'image',     // รูปภาพ
      'file',      // ไฟล์
      'audio',     // เสียง
      'video',     // วิดีโอ
      'location',  // ตำแหน่ง
      'system',    // ข้อความระบบ
      'reply',     // ตอบกลับ
      'forward',   // ส่งต่อ
      'emoji',     // อิโมจิ
      'sticker'    // สติกเกอร์
    ],
    required: true,
    default: 'text'
  },
  
  // Sender Information
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  senderInfo: {
    username: String,
    firstName: String,
    lastName: String,
    avatar: String
  },
  
  // Room/Channel
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  
  // File/Media Information
  media: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    thumbnail: String,
    duration: Number, // สำหรับ audio/video (วินาที)
    dimensions: {
      width: Number,
      height: Number
    }
  },
  
  // Reply/Forward Information
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  forwardedFrom: {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    }
  },
  
  // Message Status
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  
  // Delivery Information
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message Reactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message Mentions
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    startIndex: Number,
    endIndex: Number
  }],
  
  // Message Flags/Moderation
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date,
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Message Reports/Flags
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'harassment', 'violence', 'other']
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // System Message Data
  systemData: {
    action: {
      type: String,
      enum: [
        'user_joined',
        'user_left',
        'user_kicked',
        'user_banned',
        'room_created',
        'room_updated',
        'role_changed'
      ]
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Message Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Message Expiry (for temporary messages)
  expiresAt: Date,
  
  // Location Data
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    name: String
  },
  
  // Message Metadata
  metadata: {
    clientId: String,  // สำหรับ deduplication
    platform: String,  // web, mobile, desktop
    version: String,   // app version
    ip: String,        // sender IP
    userAgent: String  // sender user agent
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual Properties
messageSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

messageSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

messageSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

messageSchema.virtual('hasReactions').get(function() {
  return this.reactions && this.reactions.length > 0;
});

messageSchema.virtual('isSystemMessage').get(function() {
  return this.type === 'system';
});

messageSchema.virtual('hasMedia').get(function() {
  return ['image', 'file', 'audio', 'video'].includes(this.type);
});

// Indexes
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ type: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ 'mentions.user': 1 });
messageSchema.index({ content: 'text' }); // Text search
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Set sender info for faster queries
  if (this.isModified('sender') && this.populated('sender')) {
    const sender = this.sender;
    this.senderInfo = {
      username: sender.username,
      firstName: sender.firstName,
      lastName: sender.lastName,
      avatar: sender.avatar
    };
  }
  
  next();
});

// Instance Methods

// Message Status Methods
messageSchema.methods.markAsRead = function(userId) {
  // ตรวจสอบว่าอ่านแล้วหรือยัง
  const alreadyRead = this.readBy.some(
    read => read.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    
    // อัพเดท status ถ้าทุกคนอ่านแล้ว
    if (this.readBy.length === this.deliveredTo.length) {
      this.status = 'read';
    }
  }
  
  return this.save();
};

messageSchema.methods.markAsDelivered = function(userId) {
  // ตรวจสอบว่าส่งถึงแล้วหรือยัง
  const alreadyDelivered = this.deliveredTo.some(
    delivery => delivery.user.toString() === userId.toString()
  );
  
  if (!alreadyDelivered) {
    this.deliveredTo.push({
      user: userId,
      deliveredAt: new Date()
    });
    
    if (this.status === 'sent') {
      this.status = 'delivered';
    }
  }
  
  return this.save();
};

// Reaction Methods
messageSchema.methods.addReaction = function(userId, emoji) {
  // ลบ reaction เดิมของ user นี้สำหรับ emoji นี้
  this.reactions = this.reactions.filter(
    reaction => !(reaction.user.toString() === userId.toString() && 
                  reaction.emoji === emoji)
  );
  
  // เพิ่ม reaction ใหม่
  this.reactions.push({
    user: userId,
    emoji: emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

messageSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(
    reaction => !(reaction.user.toString() === userId.toString() && 
                  reaction.emoji === emoji)
  );
  
  return this.save();
};

messageSchema.methods.getReactionsByEmoji = function() {
  const reactionMap = {};
  
  this.reactions.forEach(reaction => {
    if (!reactionMap[reaction.emoji]) {
      reactionMap[reaction.emoji] = [];
    }
    reactionMap[reaction.emoji].push(reaction.user);
  });
  
  return reactionMap;
};

// Edit Methods
messageSchema.methods.editContent = function(newContent) {
  // บันทึกประวัติการแก้ไข
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });
  
  // อัพเดทเนื้อหาใหม่
  this.content = newContent;
  this.isEdited = true;
  
  return this.save();
};

// Delete Methods
messageSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  
  return this.save();
};

messageSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  
  return this.save();
};

// Report Methods
messageSchema.methods.addReport = function(reportedBy, reason, description) {
  this.reports.push({
    reportedBy: reportedBy,
    reason: reason,
    description: description,
    reportedAt: new Date()
  });
  
  return this.save();
};

// Static Methods
messageSchema.statics.findRoomMessages = function(roomId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    room: roomId,
    isDeleted: false
  })
  .populate('sender', 'username firstName lastName avatar isOnline')
  .populate('replyTo', 'content sender type createdAt')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

messageSchema.statics.findUserMessages = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    sender: userId,
    isDeleted: false
  })
  .populate('room', 'name type')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

messageSchema.statics.searchMessages = function(roomId, query, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    room: roomId,
    isDeleted: false,
    content: { $regex: query, $options: 'i' }
  })
  .populate('sender', 'username firstName lastName avatar')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

messageSchema.statics.getUnreadCount = function(roomId, userId, lastReadDate) {
  return this.countDocuments({
    room: roomId,
    sender: { $ne: userId },
    createdAt: { $gt: lastReadDate },
    isDeleted: false
  });
};

messageSchema.statics.getMessageStats = function(roomId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        room: mongoose.Types.ObjectId(roomId),
        createdAt: { $gte: startDate },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        count: { $sum: 1 },
        users: { $addToSet: "$sender" }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

messageSchema.statics.cleanupExpiredMessages = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Remove sensitive data from JSON output
messageSchema.methods.toJSON = function() {
  const messageObject = this.toObject();
  
  // ไม่แสดง sensitive metadata
  if (messageObject.metadata) {
    delete messageObject.metadata.ip;
    delete messageObject.metadata.userAgent;
  }
  
  return messageObject;
};

module.exports = mongoose.model('Message', messageSchema);