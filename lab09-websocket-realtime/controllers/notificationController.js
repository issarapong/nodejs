/**
 * Notification Controller  
 * จัดการ API endpoints สำหรับระบบการแจ้งเตือน
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class NotificationController {
  /**
   * ดึงการแจ้งเตือนของผู้ใช้
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { 
        page = 1, 
        limit = 20, 
        isRead, 
        type, 
        category, 
        priority 
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (typeof isRead === 'string') {
        options.isRead = isRead === 'true';
      }

      if (type) {
        options.type = type;
      }

      if (category) {
        options.category = category;
      }

      if (priority) {
        options.priority = priority;
      }

      const notifications = await Notification.findUserNotifications(userId, options);
      const total = await Notification.countDocuments({ 
        recipient: userId,
        ...(options.isRead !== undefined && { isRead: options.isRead }),
        ...(options.type && { type: options.type }),
        ...(options.category && { category: options.category }),
        ...(options.priority && { priority: options.priority })
      });

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      });

    } catch (error) {
      console.error('getUserNotifications error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงการแจ้งเตือน'
      });
    }
  }

  /**
   * สร้างการแจ้งเตือนใหม่
   */
  async createNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }

      const senderId = req.user.id;
      const { 
        recipient, 
        type, 
        title, 
        message, 
        priority = 'normal',
        category = 'system',
        channels = {},
        action,
        relatedTo,
        expiresAt
      } = req.body;

      // ตรวจสอบว่าผู้รับมีอยู่จริง
      const recipientUser = await User.findById(recipient);
      if (!recipientUser) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบผู้ใช้ที่ระบุ'
        });
      }

      // สร้างการแจ้งเตือนใหม่
      const notification = await Notification.createNotification({
        recipient,
        sender: senderId,
        type,
        title,
        message,
        priority,
        category,
        channels: {
          inApp: { enabled: true },
          email: { enabled: channels.email || false },
          push: { enabled: channels.push || false },
          sms: { enabled: channels.sms || false }
        },
        action,
        relatedTo,
        expiresAt,
        metadata: {
          source: 'api',
          platform: req.headers['user-agent'] || 'unknown'
        }
      });

      // Mark as delivered for in-app
      await notification.markInAppDelivered();

      // Emit real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${recipient}`).emit('new_notification', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          category: notification.category,
          sender: {
            id: req.user.id,
            username: req.user.username,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            avatar: req.user.avatar
          },
          action: notification.action,
          createdAt: notification.createdAt
        });
      }

      res.status(201).json({
        success: true,
        message: 'สร้างการแจ้งเตือนสำเร็จ',
        data: notification
      });

    } catch (error) {
      console.error('createNotification error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างการแจ้งเตือน'
      });
    }
  }

  /**
   * ทำเครื่องหมายอ่านแล้ว
   */
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบการแจ้งเตือนที่ระบุ'
        });
      }

      await notification.markAsRead();

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('notification_read', {
          id: notification._id
        });
      }

      res.json({
        success: true,
        message: 'ทำเครื่องหมายอ่านแล้วสำเร็จ'
      });

    } catch (error) {
      console.error('markAsRead error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายอ่านแล้ว'
      });
    }
  }

  /**
   * ทำเครื่องหมายอ่านทั้งหมด
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const result = await Notification.markAllAsRead(userId);

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('notifications_all_read');
      }

      res.json({
        success: true,
        message: 'ทำเครื่องหมายอ่านทั้งหมดสำเร็จ',
        data: {
          modifiedCount: result.modifiedCount
        }
      });

    } catch (error) {
      console.error('markAllAsRead error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายอ่านทั้งหมด'
      });
    }
  }

  /**
   * ลบการแจ้งเตือน
   */
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบการแจ้งเตือนที่ระบุ'
        });
      }

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('notification_deleted', {
          id: notification._id
        });
      }

      res.json({
        success: true,
        message: 'ลบการแจ้งเตือนสำเร็จ'
      });

    } catch (error) {
      console.error('deleteNotification error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบการแจ้งเตือน'
      });
    }
  }

  /**
   * ดึงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const count = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          unreadCount: count
        }
      });

    } catch (error) {
      console.error('getUnreadCount error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการนับการแจ้งเตือนที่ยังไม่อ่าน'
      });
    }
  }

  /**
   * สร้างการแจ้งเตือนแบบกลุ่ม
   */
  async createBulkNotifications(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }

      const senderId = req.user.id;
      const { 
        recipients, 
        type, 
        title, 
        message, 
        priority = 'normal',
        category = 'system',
        channels = {},
        action,
        relatedTo
      } = req.body;

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ต้องระบุรายชื่อผู้รับอย่างน้อย 1 คน'
        });
      }

      // ตรวจสอบว่าผู้รับทั้งหมดมีอยู่จริง
      const validUsers = await User.find({ 
        _id: { $in: recipients },
        status: 'active'
      });

      if (validUsers.length !== recipients.length) {
        return res.status(400).json({
          success: false,
          message: 'มีผู้ใช้บางคนที่ไม่ถูกต้องในรายชื่อ'
        });
      }

      // สร้างการแจ้งเตือนแบบกลุ่ม
      const notifications = recipients.map(recipient => ({
        recipient,
        sender: senderId,
        type,
        title,
        message,
        priority,
        category,
        channels: {
          inApp: { enabled: true },
          email: { enabled: channels.email || false },
          push: { enabled: channels.push || false },
          sms: { enabled: channels.sms || false }
        },
        action,
        relatedTo,
        metadata: {
          source: 'bulk_api',
          platform: req.headers['user-agent'] || 'unknown'
        }
      }));

      const createdNotifications = await Notification.createBulkNotifications(notifications);

      // Mark all as delivered for in-app
      await Promise.all(
        createdNotifications.map(notification => notification.markInAppDelivered())
      );

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        createdNotifications.forEach(notification => {
          io.to(`user:${notification.recipient}`).emit('new_notification', {
            id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            category: notification.category,
            sender: {
              id: req.user.id,
              username: req.user.username,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
              avatar: req.user.avatar
            },
            action: notification.action,
            createdAt: notification.createdAt
          });
        });
      }

      res.status(201).json({
        success: true,
        message: `สร้างการแจ้งเตือนสำเร็จ ${createdNotifications.length} รายการ`,
        data: {
          count: createdNotifications.length,
          batchId: createdNotifications[0].metadata.batch
        }
      });

    } catch (error) {
      console.error('createBulkNotifications error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างการแจ้งเตือนแบบกลุ่ม'
      });
    }
  }

  /**
   * ดึงสถิติการแจ้งเตือน
   */
  async getNotificationStats(req, res) {
    try {
      const userId = req.user.id;
      const { days = 7 } = req.query;

      const stats = await Notification.getNotificationStats(userId, parseInt(days));
      const unreadCount = await Notification.getUnreadCount(userId);

      // สถิติเพิ่มเติม
      const totalCount = await Notification.countDocuments({ recipient: userId });
      const readCount = await Notification.countDocuments({ 
        recipient: userId, 
        isRead: true 
      });

      res.json({
        success: true,
        data: {
          unreadCount,
          totalCount,
          readCount,
          readPercentage: totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0,
          dailyStats: stats
        }
      });

    } catch (error) {
      console.error('getNotificationStats error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติการแจ้งเตือน'
      });
    }
  }

  /**
   * อัพเดทการตั้งค่าการแจ้งเตือน
   */
  async updateNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const { settings } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            'notificationSettings': {
              ...settings,
              // Ensure required fields exist
              email: settings.email !== undefined ? settings.email : true,
              push: settings.push !== undefined ? settings.push : true,
              sound: settings.sound !== undefined ? settings.sound : true,
              mentions: settings.mentions !== undefined ? settings.mentions : true,
              directMessages: settings.directMessages !== undefined ? settings.directMessages : true
            }
          }
        },
        { new: true }
      ).select('notificationSettings');

      res.json({
        success: true,
        message: 'อัพเดทการตั้งค่าการแจ้งเตือนสำเร็จ',
        data: user.notificationSettings
      });

    } catch (error) {
      console.error('updateNotificationSettings error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัพเดทการตั้งค่า'
      });
    }
  }

  /**
   * ดึงการตั้งค่าการแจ้งเตือน
   */
  async getNotificationSettings(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select('notificationSettings');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบผู้ใช้'
        });
      }

      res.json({
        success: true,
        data: user.notificationSettings
      });

    } catch (error) {
      console.error('getNotificationSettings error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงการตั้งค่าการแจ้งเตือน'
      });
    }
  }
}

module.exports = new NotificationController();