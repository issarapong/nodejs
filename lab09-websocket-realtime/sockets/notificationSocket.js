/**
 * Notification Socket Handlers  
 * จัดการ real-time notifications
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const redisClient = require('../config/redis');
const { socketValidation, socketRateLimit } = require('../middleware/socketAuth');

class NotificationSocketHandler {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // Track user socket connections
  }

  /**
   * Handle notification socket connections
   */
  handleConnection(socket) {
    console.log(`🔔 Notification socket connected: ${socket.id} (User: ${socket.username})`);

    // เข้าร่วม personal notification room
    socket.join(`notifications:${socket.userId}`);
    
    // Track user socket
    this.userSockets.set(socket.userId, socket.id);

    // ลงทะเบียน event handlers
    this.registerEventHandlers(socket);

    // ส่งการแจ้งเตือนที่ยังไม่อ่าน
    this.sendUnreadNotifications(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * ลงทะเบียน event handlers สำหรับ notification
   */
  registerEventHandlers(socket) {
    // Get notifications with pagination
    socket.on('get_notifications', (data, callback) => {
      this.handleGetNotifications(socket, data, callback);
    });

    // Mark notification as read
    socket.on('mark_notification_read', 
      socketRateLimit({ maxRequests: 50, windowMs: 60000 }),
      (data, callback) => {
        this.handleMarkNotificationRead(socket, data, callback);
      }
    );

    // Mark all notifications as read
    socket.on('mark_all_notifications_read', (callback) => {
      this.handleMarkAllNotificationsRead(socket, callback);
    });

    // Delete notification
    socket.on('delete_notification', (data, callback) => {
      this.handleDeleteNotification(socket, data, callback);
    });

    // Clear all notifications
    socket.on('clear_all_notifications', (callback) => {
      this.handleClearAllNotifications(socket, callback);
    });

    // Update notification preferences
    socket.on('update_notification_preferences', (data, callback) => {
      this.handleUpdateNotificationPreferences(socket, data, callback);
    });

    // Test notification (development only)
    if (process.env.NODE_ENV === 'development') {
      socket.on('test_notification', (data) => {
        this.handleTestNotification(socket, data);
      });
    }

    // Subscribe to specific notification channels
    socket.on('subscribe_channel', (data, callback) => {
      this.handleSubscribeChannel(socket, data, callback);
    });

    socket.on('unsubscribe_channel', (data, callback) => {
      this.handleUnsubscribeChannel(socket, data, callback);
    });

    // Get notification statistics
    socket.on('get_notification_stats', (callback) => {
      this.handleGetNotificationStats(socket, callback);
    });

    // Set notification delivery status
    socket.on('notification_delivered', (data) => {
      this.handleNotificationDelivered(socket, data);
    });
  }

  /**
   * Handle get notifications
   */
  async handleGetNotifications(socket, data, callback) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        type, 
        category, 
        isRead, 
        priority,
        startDate,
        endDate 
      } = data;

      const query = { recipient: socket.userId };

      // Add filters
      if (type) query.type = type;
      if (category) query.category = category;
      if (isRead !== undefined) query.isRead = isRead;
      if (priority) query.priority = priority;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const notifications = await Notification.find(query)
        .populate('sender', 'username firstName lastName avatar')
        .sort({ createdAt: -1, priority: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({
        recipient: socket.userId,
        isRead: false
      });

      callback?.({ 
        success: true, 
        data: {
          notifications,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          unreadCount
        }
      });

    } catch (error) {
      console.error('Get notifications error:', error);
      callback?.({ success: false, message: 'Failed to get notifications' });
    }
  }

  /**
   * Handle mark notification as read
   */
  async handleMarkNotificationRead(socket, data, callback) {
    try {
      const { notificationId } = data;

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: socket.userId },
        { 
          isRead: true, 
          readAt: new Date(),
          $push: {
            'deliveryStatus.read': {
              timestamp: new Date(),
              device: 'web'
            }
          }
        },
        { new: true }
      );

      if (!notification) {
        return callback?.({ success: false, message: 'Notification not found' });
      }

      // อัพเดท unread count
      const unreadCount = await this.getUnreadCount(socket.userId);

      // Broadcast unread count update
      this.io.to(`notifications:${socket.userId}`).emit('unread_count_updated', {
        unreadCount,
        timestamp: new Date()
      });

      callback?.({ 
        success: true, 
        data: { 
          notification,
          unreadCount 
        }
      });

      console.log(`📖 Notification marked as read by ${socket.username}`);

    } catch (error) {
      console.error('Mark notification read error:', error);
      callback?.({ success: false, message: 'Failed to mark notification as read' });
    }
  }

  /**
   * Handle mark all notifications as read
   */
  async handleMarkAllNotificationsRead(socket, callback) {
    try {
      await Notification.updateMany(
        { recipient: socket.userId, isRead: false },
        { 
          isRead: true, 
          readAt: new Date(),
          $push: {
            'deliveryStatus.read': {
              timestamp: new Date(),
              device: 'web'
            }
          }
        }
      );

      // Broadcast unread count update
      this.io.to(`notifications:${socket.userId}`).emit('unread_count_updated', {
        unreadCount: 0,
        timestamp: new Date()
      });

      callback?.({ success: true, message: 'All notifications marked as read' });

      console.log(`📖 All notifications marked as read by ${socket.username}`);

    } catch (error) {
      console.error('Mark all notifications read error:', error);
      callback?.({ success: false, message: 'Failed to mark all notifications as read' });
    }
  }

  /**
   * Handle delete notification
   */
  async handleDeleteNotification(socket, data, callback) {
    try {
      const { notificationId } = data;

      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: socket.userId
      });

      if (!notification) {
        return callback?.({ success: false, message: 'Notification not found' });
      }

      // อัพเดท unread count
      const unreadCount = await this.getUnreadCount(socket.userId);

      // Broadcast notification deletion
      this.io.to(`notifications:${socket.userId}`).emit('notification_deleted', {
        notificationId,
        unreadCount,
        timestamp: new Date()
      });

      callback?.({ success: true, message: 'Notification deleted', unreadCount });

    } catch (error) {
      console.error('Delete notification error:', error);
      callback?.({ success: false, message: 'Failed to delete notification' });
    }
  }

  /**
   * Handle clear all notifications
   */
  async handleClearAllNotifications(socket, callback) {
    try {
      const result = await Notification.deleteMany({
        recipient: socket.userId
      });

      // Broadcast all notifications cleared
      this.io.to(`notifications:${socket.userId}`).emit('all_notifications_cleared', {
        deletedCount: result.deletedCount,
        timestamp: new Date()
      });

      callback?.({ 
        success: true, 
        message: 'All notifications cleared',
        deletedCount: result.deletedCount 
      });

    } catch (error) {
      console.error('Clear all notifications error:', error);
      callback?.({ success: false, message: 'Failed to clear all notifications' });
    }
  }

  /**
   * Handle update notification preferences
   */
  async handleUpdateNotificationPreferences(socket, data, callback) {
    try {
      const { preferences } = data;

      const user = await User.findByIdAndUpdate(
        socket.userId,
        { 
          $set: {
            'settings.notifications': {
              ...socket.user.settings.notifications,
              ...preferences
            }
          }
        },
        { new: true, runValidators: true }
      );

      // Update socket user data
      socket.user = user;

      callback?.({ 
        success: true, 
        message: 'Notification preferences updated',
        data: { preferences: user.settings.notifications }
      });

    } catch (error) {
      console.error('Update notification preferences error:', error);
      callback?.({ success: false, message: 'Failed to update notification preferences' });
    }
  }

  /**
   * Handle subscribe to notification channel
   */
  async handleSubscribeChannel(socket, data, callback) {
    try {
      const { channel } = data;

      // Validate channel name
      const allowedChannels = [
        'system', 'chat', 'user-activity', 'security', 
        'maintenance', 'announcements', 'updates'
      ];

      if (!allowedChannels.includes(channel)) {
        return callback?.({ success: false, message: 'Invalid channel' });
      }

      await socket.join(`channel:${channel}`);

      callback?.({ 
        success: true, 
        message: `Subscribed to ${channel} channel`
      });

      console.log(`📢 User ${socket.username} subscribed to channel: ${channel}`);

    } catch (error) {
      console.error('Subscribe channel error:', error);
      callback?.({ success: false, message: 'Failed to subscribe to channel' });
    }
  }

  /**
   * Handle unsubscribe from notification channel
   */
  async handleUnsubscribeChannel(socket, data, callback) {
    try {
      const { channel } = data;

      await socket.leave(`channel:${channel}`);

      callback?.({ 
        success: true, 
        message: `Unsubscribed from ${channel} channel`
      });

      console.log(`📢 User ${socket.username} unsubscribed from channel: ${channel}`);

    } catch (error) {
      console.error('Unsubscribe channel error:', error);
      callback?.({ success: false, message: 'Failed to unsubscribe from channel' });
    }
  }

  /**
   * Handle get notification statistics
   */
  async handleGetNotificationStats(socket, callback) {
    try {
      const [totalCount, unreadCount, readCount, todayCount, weekCount] = await Promise.all([
        Notification.countDocuments({ recipient: socket.userId }),
        Notification.countDocuments({ recipient: socket.userId, isRead: false }),
        Notification.countDocuments({ recipient: socket.userId, isRead: true }),
        Notification.countDocuments({ 
          recipient: socket.userId, 
          createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        }),
        Notification.countDocuments({ 
          recipient: socket.userId, 
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
      ]);

      const typeStats = await Notification.aggregate([
        { $match: { recipient: socket.userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const categoryStats = await Notification.aggregate([
        { $match: { recipient: socket.userId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      callback?.({ 
        success: true, 
        data: {
          total: totalCount,
          unread: unreadCount,
          read: readCount,
          today: todayCount,
          thisWeek: weekCount,
          byType: typeStats,
          byCategory: categoryStats
        }
      });

    } catch (error) {
      console.error('Get notification stats error:', error);
      callback?.({ success: false, message: 'Failed to get notification statistics' });
    }
  }

  /**
   * Handle notification delivered status
   */
  async handleNotificationDelivered(socket, data) {
    try {
      const { notificationId } = data;

      await Notification.findByIdAndUpdate(notificationId, {
        $push: {
          'deliveryStatus.delivered': {
            timestamp: new Date(),
            device: 'web',
            socketId: socket.id
          }
        }
      });

    } catch (error) {
      console.error('Notification delivered error:', error);
    }
  }

  /**
   * Handle test notification (development only)
   */
  async handleTestNotification(socket, data) {
    if (process.env.NODE_ENV !== 'development') return;

    try {
      const { type = 'test', title, message } = data;

      await this.sendNotificationToUser(socket.userId, {
        type,
        title: title || 'Test Notification',
        message: message || 'This is a test notification from the system.',
        priority: 'normal',
        category: 'system',
        sender: socket.userId
      });

    } catch (error) {
      console.error('Test notification error:', error);
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket) {
    console.log(`🔔 Notification socket disconnected: ${socket.id} (User: ${socket.username})`);
    
    // Remove user socket tracking
    this.userSockets.delete(socket.userId);
  }

  /**
   * ส่งการแจ้งเตือนที่ยังไม่อ่าน
   */
  async sendUnreadNotifications(socket) {
    try {
      const unreadNotifications = await Notification.find({
        recipient: socket.userId,
        isRead: false
      })
      .populate('sender', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(10);

      const unreadCount = await this.getUnreadCount(socket.userId);

      if (unreadNotifications.length > 0) {
        socket.emit('unread_notifications', {
          notifications: unreadNotifications,
          count: unreadCount,
          hasMore: unreadCount > 10
        });
      }

      // ส่ง unread count
      socket.emit('unread_count_updated', {
        unreadCount,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Send unread notifications error:', error);
    }
  }

  /**
   * ส่งการแจ้งเตือนให้ผู้ใช้
   */
  async sendNotificationToUser(userId, notificationData) {
    try {
      const notification = await Notification.createNotification({
        recipient: userId,
        ...notificationData
      });

      // Populate sender data
      await notification.populate('sender', 'username firstName lastName avatar');

      // ส่งผ่าน Socket.io
      this.io.to(`notifications:${userId}`).emit('new_notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        category: notification.category,
        sender: notification.sender,
        action: notification.action,
        relatedTo: notification.relatedTo,
        createdAt: notification.createdAt,
        isRead: false
      });

      // อัพเดท unread count
      const unreadCount = await this.getUnreadCount(userId);
      this.io.to(`notifications:${userId}`).emit('unread_count_updated', {
        unreadCount,
        timestamp: new Date()
      });

      console.log(`🔔 Notification sent to user ${userId}: ${notification.title}`);

      return notification;

    } catch (error) {
      console.error('Send notification to user error:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนแบบ broadcast
   */
  async broadcastNotification(channel, notificationData) {
    try {
      // ส่งให้ทุกคนใน channel
      this.io.to(`channel:${channel}`).emit('broadcast_notification', {
        ...notificationData,
        channel,
        timestamp: new Date()
      });

      console.log(`📢 Broadcast notification sent to channel: ${channel}`);

    } catch (error) {
      console.error('Broadcast notification error:', error);
    }
  }

  /**
   * ส่งการแจ้งเตือนแบบ bulk
   */
  async sendBulkNotifications(userIds, notificationData) {
    try {
      const notifications = await Notification.createBulkNotifications(
        userIds,
        notificationData
      );

      // ส่งให้แต่ละผู้ใช้
      for (const userId of userIds) {
        const userNotification = notifications.find(n => 
          n.recipient.toString() === userId.toString()
        );

        if (userNotification) {
          this.io.to(`notifications:${userId}`).emit('new_notification', {
            id: userNotification._id,
            type: userNotification.type,
            title: userNotification.title,
            message: userNotification.message,
            priority: userNotification.priority,
            category: userNotification.category,
            sender: userNotification.sender,
            action: userNotification.action,
            relatedTo: userNotification.relatedTo,
            createdAt: userNotification.createdAt,
            isRead: false
          });

          // อัพเดท unread count
          const unreadCount = await this.getUnreadCount(userId);
          this.io.to(`notifications:${userId}`).emit('unread_count_updated', {
            unreadCount,
            timestamp: new Date()
          });
        }
      }

      console.log(`🔔 Bulk notifications sent to ${userIds.length} users`);

      return notifications;

    } catch (error) {
      console.error('Send bulk notifications error:', error);
      throw error;
    }
  }

  /**
   * ดึงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
   */
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  /**
   * ตรวจสอบว่าผู้ใช้ออนไลน์หรือไม่
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }

  /**
   * ดึง Socket ID ของผู้ใช้
   */
  getUserSocketId(userId) {
    return this.userSockets.get(userId);
  }
}

module.exports = NotificationSocketHandler;