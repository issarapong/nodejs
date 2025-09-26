/**
 * Notification Model - โมเดลแจ้งเตือน
 * รองรับ real-time notifications, email และ push notifications
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient Information
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification Type
  type: {
    type: String,
    enum: [
      'message',           // ข้อความใหม่
      'mention',           // ถูก mention
      'room_invite',       // เชิญเข้าห้อง
      'room_join',         // มีคนเข้าห้อง
      'room_leave',        // มีคนออกจากห้อง
      'friend_request',    // คำขอเป็นเพื่อน
      'friend_accept',     // ยอมรับเป็นเพื่อน
      'system',            // แจ้งเตือนระบบ
      'announcement',      // ประกาศ
      'reminder',          // การแจ้งเตือน
      'alert',             // แจ้งเตือนเร่งด่วน
      'update',            // อัพเดท
      'security',          // ความปลอดภัย
      'maintenance'        // การบำรุงรักษา
    ],
    required: true
  },
  
  // Notification Title & Message
  title: {
    type: String,
    required: true,
    maxlength: [100, 'หัวข้อต้องไม่เกิน 100 ตัวอักษร']
  },
  
  message: {
    type: String,
    required: true,
    maxlength: [500, 'ข้อความต้องไม่เกิน 500 ตัวอักษร']
  },
  
  // Sender Information (optional)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  senderInfo: {
    username: String,
    firstName: String,
    lastName: String,
    avatar: String
  },
  
  // Related Data
  relatedTo: {
    model: {
      type: String,
      enum: ['Message', 'Room', 'User', 'System']
    },
    id: mongoose.Schema.Types.ObjectId,
    data: mongoose.Schema.Types.Mixed
  },
  
  // Notification Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: Date,
  
  // Delivery Channels
  channels: {
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      },
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date
    },
    
    email: {
      enabled: {
        type: Boolean,
        default: false
      },
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      emailId: String,
      error: String
    },
    
    push: {
      enabled: {
        type: Boolean,
        default: false
      },
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      pushId: String,
      error: String
    },
    
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      smsId: String,
      error: String
    }
  },
  
  // Notification Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Notification Category
  category: {
    type: String,
    enum: [
      'chat',
      'system',
      'security',
      'social',
      'update',
      'marketing',
      'reminder'
    ],
    default: 'system'
  },
  
  // Action Data
  action: {
    type: {
      type: String,
      enum: ['none', 'navigate', 'callback', 'external']
    },
    url: String,
    callback: String,
    data: mongoose.Schema.Types.Mixed
  },
  
  // Metadata
  metadata: {
    source: String,      // แหล่งที่มาของ notification
    campaign: String,    // สำหรับ marketing notifications
    batch: String,       // batch ID สำหรับ bulk notifications
    tags: [String],      // tags สำหรับการจัดกลุ่ม
    platform: String,    // platform ที่ส่ง
    version: String      // app version
  },
  
  // Expiry
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  
  // Retry Logic
  retry: {
    count: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    lastRetryAt: Date,
    nextRetryAt: Date,
    errors: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual Properties
notificationSchema.virtual('isDelivered').get(function() {
  return this.channels.inApp.delivered || 
         this.channels.email.delivered || 
         this.channels.push.delivered || 
         this.channels.sms.delivered;
});

notificationSchema.virtual('deliveredChannels').get(function() {
  const delivered = [];
  if (this.channels.inApp.delivered) delivered.push('inApp');
  if (this.channels.email.delivered) delivered.push('email');
  if (this.channels.push.delivered) delivered.push('push');
  if (this.channels.sms.delivered) delivered.push('sms');
  return delivered;
});

notificationSchema.virtual('canRetry').get(function() {
  return this.retry.count < this.retry.maxRetries;
});

notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ 'relatedTo.model': 1, 'relatedTo.id': 1 });
notificationSchema.index({ 'metadata.batch': 1 });
notificationSchema.index({ expiresAt: 1 });

// Pre-save middleware
notificationSchema.pre('save', function(next) {
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
  
  // Set default expiry (30 days)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Instance Methods

// Read/Unread Methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  this.status = 'read';
  return this.save();
};

notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = undefined;
  if (this.status === 'read') {
    this.status = 'delivered';
  }
  return this.save();
};

// Delivery Methods
notificationSchema.methods.markInAppDelivered = function() {
  this.channels.inApp.delivered = true;
  this.channels.inApp.deliveredAt = new Date();
  
  if (this.status === 'pending' || this.status === 'sent') {
    this.status = 'delivered';
  }
  
  return this.save();
};

notificationSchema.methods.markEmailDelivered = function(emailId) {
  this.channels.email.delivered = true;
  this.channels.email.deliveredAt = new Date();
  this.channels.email.emailId = emailId;
  return this.save();
};

notificationSchema.methods.markEmailFailed = function(error) {
  this.channels.email.delivered = false;
  this.channels.email.error = error;
  return this.save();
};

notificationSchema.methods.markPushDelivered = function(pushId) {
  this.channels.push.delivered = true;
  this.channels.push.deliveredAt = new Date();
  this.channels.push.pushId = pushId;
  return this.save();
};

notificationSchema.methods.markPushFailed = function(error) {
  this.channels.push.delivered = false;
  this.channels.push.error = error;
  return this.save();
};

// Retry Methods
notificationSchema.methods.incrementRetry = function(error) {
  this.retry.count += 1;
  this.retry.lastRetryAt = new Date();
  this.retry.errors.push(error);
  
  if (this.retry.count < this.retry.maxRetries) {
    // Schedule next retry (exponential backoff)
    const delay = Math.pow(2, this.retry.count) * 60 * 1000; // minutes
    this.retry.nextRetryAt = new Date(Date.now() + delay);
    this.status = 'pending';
  } else {
    this.status = 'failed';
  }
  
  return this.save();
};

notificationSchema.methods.resetRetry = function() {
  this.retry.count = 0;
  this.retry.lastRetryAt = undefined;
  this.retry.nextRetryAt = undefined;
  this.retry.errors = [];
  return this.save();
};

// Static Methods
notificationSchema.statics.findUserNotifications = function(userId, options = {}) {
  const {
    isRead,
    type,
    category,
    priority,
    page = 1,
    limit = 20
  } = options;
  
  const query = { recipient: userId };
  
  if (typeof isRead === 'boolean') {
    query.isRead = isRead;
  }
  
  if (type) {
    query.type = type;
  }
  
  if (category) {
    query.category = category;
  }
  
  if (priority) {
    query.priority = priority;
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .populate('sender', 'username firstName lastName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false
  });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      recipient: userId,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
        status: 'read'
      }
    }
  );
};

notificationSchema.statics.createNotification = async function(data) {
  const notification = new this({
    recipient: data.recipient,
    type: data.type,
    title: data.title,
    message: data.message,
    sender: data.sender,
    relatedTo: data.relatedTo,
    priority: data.priority || 'normal',
    category: data.category || 'system',
    action: data.action,
    metadata: data.metadata,
    expiresAt: data.expiresAt,
    channels: data.channels || {
      inApp: { enabled: true },
      email: { enabled: false },
      push: { enabled: false },
      sms: { enabled: false }
    }
  });
  
  return await notification.save();
};

notificationSchema.statics.createBulkNotifications = async function(notifications) {
  const batchId = require('uuid').v4();
  
  const notificationsWithBatch = notifications.map(notif => ({
    ...notif,
    metadata: {
      ...notif.metadata,
      batch: batchId
    }
  }));
  
  return await this.insertMany(notificationsWithBatch);
};

notificationSchema.statics.getNotificationStats = function(userId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        recipient: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          type: "$type"
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        types: {
          $push: {
            type: "$_id.type",
            count: "$count"
          }
        },
        total: { $sum: "$count" }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

notificationSchema.statics.getPendingForRetry = function(limit = 100) {
  return this.find({
    status: 'pending',
    'retry.nextRetryAt': { $lte: new Date() },
    'retry.count': { $lt: '$retry.maxRetries' }
  })
  .limit(limit);
};

notificationSchema.statics.cleanupOldNotifications = function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { 
        createdAt: { $lt: cutoffDate },
        isRead: true
      }
    ]
  });
};

notificationSchema.statics.getSystemStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        byType: {
          $push: {
            type: '$type',
            priority: '$priority',
            category: '$category'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Notification', notificationSchema);