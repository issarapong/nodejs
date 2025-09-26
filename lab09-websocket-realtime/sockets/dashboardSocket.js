/**
 * Dashboard Socket Handlers
 * จัดการ real-time dashboard และ analytics
 */

const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const redisClient = require('../config/redis');
const { socketValidation, socketRateLimit } = require('../middleware/socketAuth');

class DashboardSocketHandler {
  constructor(io) {
    this.io = io;
    this.adminSockets = new Map(); // Track admin socket connections
    this.refreshInterval = null;
    this.metricsCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  /**
   * Handle dashboard socket connections
   */
  handleConnection(socket) {
    console.log(`📊 Dashboard socket connected: ${socket.id} (User: ${socket.username})`);

    // ตรวจสอบสิทธิ์ admin/moderator
    if (!this.hasAdminAccess(socket)) {
      socket.emit('access_denied', { message: 'Admin access required' });
      socket.disconnect();
      return;
    }

    // เข้าร่วม admin dashboard room
    socket.join('admin:dashboard');
    
    // Track admin socket
    this.adminSockets.set(socket.userId, socket.id);

    // ลงทะเบียน event handlers
    this.registerEventHandlers(socket);

    // ส่งข้อมูล dashboard เริ่มต้น
    this.sendInitialDashboardData(socket);

    // เริ่ม real-time updates
    this.startRealTimeUpdates(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * ลงทะเบียน event handlers สำหรับ dashboard
   */
  registerEventHandlers(socket) {
    // Get system statistics
    socket.on('get_system_stats', (callback) => {
      this.handleGetSystemStats(socket, callback);
    });

    // Get user analytics
    socket.on('get_user_analytics', (data, callback) => {
      this.handleGetUserAnalytics(socket, data, callback);
    });

    // Get chat analytics
    socket.on('get_chat_analytics', (data, callback) => {
      this.handleGetChatAnalytics(socket, data, callback);
    });

    // Get server performance metrics
    socket.on('get_performance_metrics', (callback) => {
      this.handleGetPerformanceMetrics(socket, callback);
    });

    // Get active users
    socket.on('get_active_users', (data, callback) => {
      this.handleGetActiveUsers(socket, data, callback);
    });

    // Get recent activities
    socket.on('get_recent_activities', (data, callback) => {
      this.handleGetRecentActivities(socket, data, callback);
    });

    // Get error logs
    socket.on('get_error_logs', (data, callback) => {
      this.handleGetErrorLogs(socket, data, callback);
    });

    // Admin actions
    socket.on('admin_action', 
      socketRateLimit({ maxRequests: 20, windowMs: 60000 }),
      (data, callback) => {
        this.handleAdminAction(socket, data, callback);
      }
    );

    // Broadcast admin message
    socket.on('broadcast_message', (data, callback) => {
      this.handleBroadcastMessage(socket, data, callback);
    });

    // System maintenance
    socket.on('system_maintenance', (data, callback) => {
      this.handleSystemMaintenance(socket, data, callback);
    });

    // Export data
    socket.on('export_data', (data, callback) => {
      this.handleExportData(socket, data, callback);
    });

    // Subscribe to specific metrics
    socket.on('subscribe_metrics', (data, callback) => {
      this.handleSubscribeMetrics(socket, data, callback);
    });

    socket.on('unsubscribe_metrics', (data, callback) => {
      this.handleUnsubscribeMetrics(socket, data, callback);
    });
  }

  /**
   * Handle get system statistics
   */
  async handleGetSystemStats(socket, callback) {
    try {
      const cacheKey = 'system_stats';
      let stats = this.getFromCache(cacheKey);

      if (!stats) {
        const [
          userStats,
          chatStats,
          serverStats,
          performanceStats
        ] = await Promise.all([
          this.getUserStats(),
          this.getChatStats(),
          this.getServerStats(),
          this.getPerformanceStats()
        ]);

        stats = {
          users: userStats,
          chat: chatStats,
          server: serverStats,
          performance: performanceStats,
          timestamp: new Date()
        };

        this.setCache(cacheKey, stats);
      }

      callback?.({ success: true, data: stats });

    } catch (error) {
      console.error('Get system stats error:', error);
      callback?.({ success: false, message: 'Failed to get system statistics' });
    }
  }

  /**
   * Handle get user analytics
   */
  async handleGetUserAnalytics(socket, data, callback) {
    try {
      const { period = '7d', type = 'overview' } = data;
      const cacheKey = `user_analytics_${period}_${type}`;
      
      let analytics = this.getFromCache(cacheKey);

      if (!analytics) {
        analytics = await this.generateUserAnalytics(period, type);
        this.setCache(cacheKey, analytics);
      }

      callback?.({ success: true, data: analytics });

    } catch (error) {
      console.error('Get user analytics error:', error);
      callback?.({ success: false, message: 'Failed to get user analytics' });
    }
  }

  /**
   * Handle get chat analytics
   */
  async handleGetChatAnalytics(socket, data, callback) {
    try {
      const { period = '7d', roomId } = data;
      const cacheKey = `chat_analytics_${period}_${roomId || 'all'}`;
      
      let analytics = this.getFromCache(cacheKey);

      if (!analytics) {
        analytics = await this.generateChatAnalytics(period, roomId);
        this.setCache(cacheKey, analytics);
      }

      callback?.({ success: true, data: analytics });

    } catch (error) {
      console.error('Get chat analytics error:', error);
      callback?.({ success: false, message: 'Failed to get chat analytics' });
    }
  }

  /**
   * Handle get performance metrics
   */
  async handleGetPerformanceMetrics(socket, callback) {
    try {
      const metrics = await this.getServerPerformanceMetrics();
      
      callback?.({ success: true, data: metrics });

    } catch (error) {
      console.error('Get performance metrics error:', error);
      callback?.({ success: false, message: 'Failed to get performance metrics' });
    }
  }

  /**
   * Handle get active users
   */
  async handleGetActiveUsers(socket, data, callback) {
    try {
      const { limit = 50, sortBy = 'lastSeen' } = data;

      const activeUsers = await User.find({
        isOnline: true
      })
      .select('username firstName lastName email lastSeen avatar isOnline socketIds')
      .sort({ [sortBy]: -1 })
      .limit(limit)
      .lean();

      const userActivities = await Promise.all(
        activeUsers.map(async (user) => {
          const recentActivity = await this.getUserRecentActivity(user._id);
          return {
            ...user,
            activity: recentActivity
          };
        })
      );

      callback?.({ 
        success: true, 
        data: { 
          users: userActivities,
          count: activeUsers.length,
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('Get active users error:', error);
      callback?.({ success: false, message: 'Failed to get active users' });
    }
  }

  /**
   * Handle get recent activities
   */
  async handleGetRecentActivities(socket, data, callback) {
    try {
      const { limit = 100, type } = data;

      let activities = [];

      // Get different types of activities
      const [userActivities, chatActivities, systemActivities] = await Promise.all([
        this.getRecentUserActivities(limit),
        this.getRecentChatActivities(limit),
        this.getRecentSystemActivities(limit)
      ]);

      if (!type || type === 'users') {
        activities = [...activities, ...userActivities];
      }
      if (!type || type === 'chat') {
        activities = [...activities, ...chatActivities];
      }
      if (!type || type === 'system') {
        activities = [...activities, ...systemActivities];
      }

      // Sort by timestamp and limit
      activities = activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      callback?.({ 
        success: true, 
        data: { 
          activities,
          count: activities.length,
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('Get recent activities error:', error);
      callback?.({ success: false, message: 'Failed to get recent activities' });
    }
  }

  /**
   * Handle admin actions
   */
  async handleAdminAction(socket, data, callback) {
    try {
      const { action, target, targetId, reason, duration } = data;

      let result;
      
      switch (action) {
        case 'ban_user':
          result = await this.banUser(targetId, reason, duration, socket.userId);
          break;
        case 'unban_user':
          result = await this.unbanUser(targetId, socket.userId);
          break;
        case 'mute_user':
          result = await this.muteUser(targetId, duration, socket.userId);
          break;
        case 'unmute_user':
          result = await this.unmuteUser(targetId, socket.userId);
          break;
        case 'delete_room':
          result = await this.deleteRoom(targetId, socket.userId);
          break;
        case 'archive_room':
          result = await this.archiveRoom(targetId, socket.userId);
          break;
        case 'clear_messages':
          result = await this.clearMessages(targetId, socket.userId);
          break;
        default:
          throw new Error('Invalid admin action');
      }

      // Log admin action
      await this.logAdminAction(socket.userId, action, target, targetId, reason, result);

      // Broadcast admin action to other admins
      socket.to('admin:dashboard').emit('admin_action_performed', {
        action,
        target,
        targetId,
        reason,
        performedBy: {
          id: socket.userId,
          username: socket.username
        },
        result,
        timestamp: new Date()
      });

      callback?.({ success: true, data: result });

    } catch (error) {
      console.error('Admin action error:', error);
      callback?.({ success: false, message: error.message || 'Failed to perform admin action' });
    }
  }

  /**
   * Handle broadcast message
   */
  async handleBroadcastMessage(socket, data, callback) {
    try {
      const { message, title, priority = 'normal', channels = ['all'] } = data;

      // Create system notification
      const notification = {
        type: 'system_announcement',
        title: title || 'System Announcement',
        message,
        priority,
        category: 'system',
        sender: socket.userId
      };

      if (channels.includes('all')) {
        // Broadcast to all connected users
        this.io.emit('system_broadcast', {
          ...notification,
          timestamp: new Date()
        });

        // Create notifications for all users
        const allUsers = await User.find({}, '_id').lean();
        const userIds = allUsers.map(u => u._id);
        
        await Notification.createBulkNotifications(userIds, notification);

      } else {
        // Broadcast to specific channels
        for (const channel of channels) {
          this.io.to(`channel:${channel}`).emit('system_broadcast', {
            ...notification,
            channel,
            timestamp: new Date()
          });
        }
      }

      // Log broadcast
      console.log(`📢 System broadcast sent by ${socket.username}: ${message}`);

      callback?.({ success: true, message: 'Broadcast sent successfully' });

    } catch (error) {
      console.error('Broadcast message error:', error);
      callback?.({ success: false, message: 'Failed to send broadcast' });
    }
  }

  /**
   * Handle system maintenance
   */
  async handleSystemMaintenance(socket, data, callback) {
    try {
      const { action, scheduledTime, duration, message } = data;

      switch (action) {
        case 'schedule':
          await this.scheduleMaintenanceWindow(scheduledTime, duration, message);
          break;
        case 'start':
          await this.startMaintenanceMode(message);
          break;
        case 'end':
          await this.endMaintenanceMode();
          break;
        case 'cancel':
          await this.cancelScheduledMaintenance();
          break;
        default:
          throw new Error('Invalid maintenance action');
      }

      callback?.({ success: true, message: `Maintenance ${action} completed` });

    } catch (error) {
      console.error('System maintenance error:', error);
      callback?.({ success: false, message: 'Failed to handle maintenance' });
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket) {
    console.log(`📊 Dashboard socket disconnected: ${socket.id} (User: ${socket.username})`);
    
    // Remove admin socket tracking
    this.adminSockets.delete(socket.userId);

    // Stop real-time updates if no admin connected
    if (this.adminSockets.size === 0) {
      this.stopRealTimeUpdates();
    }
  }

  /**
   * ส่งข้อมูล dashboard เริ่มต้น
   */
  async sendInitialDashboardData(socket) {
    try {
      const [systemStats, activeUsers, recentActivities] = await Promise.all([
        this.getSystemStats(),
        this.getActiveUsers(20),
        this.getRecentActivities(50)
      ]);

      socket.emit('dashboard_initial_data', {
        systemStats,
        activeUsers,
        recentActivities,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Send initial dashboard data error:', error);
    }
  }

  /**
   * เริ่ม real-time updates
   */
  startRealTimeUpdates(socket) {
    if (!this.refreshInterval) {
      this.refreshInterval = setInterval(async () => {
        try {
          // Clear cache
          this.metricsCache.clear();

          // Send updated metrics to all admin sockets
          const metrics = await this.getRealtimeMetrics();
          
          this.io.to('admin:dashboard').emit('dashboard_metrics_update', {
            ...metrics,
            timestamp: new Date()
          });

        } catch (error) {
          console.error('Real-time updates error:', error);
        }
      }, 5000); // Update every 5 seconds
    }
  }

  /**
   * หยุด real-time updates
   */
  stopRealTimeUpdates() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * ตรวจสอบสิทธิ์ admin
   */
  hasAdminAccess(socket) {
    return socket.user && (
      socket.user.roles.includes('admin') || 
      socket.user.roles.includes('moderator')
    );
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    const [userStats, chatStats] = await Promise.all([
      this.getUserStats(),
      this.getChatStats()
    ]);

    return {
      users: userStats,
      chat: chatStats,
      server: await this.getServerStats(),
      timestamp: new Date()
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const [total, online, today, thisWeek] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      User.countDocuments({ 
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      User.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    return { total, online, registeredToday: today, registeredThisWeek: thisWeek };
  }

  /**
   * Get chat statistics
   */
  async getChatStats() {
    const [totalRooms, totalMessages, messagesToday, messagesThisWeek] = await Promise.all([
      Room.countDocuments(),
      Message.countDocuments(),
      Message.countDocuments({ 
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      Message.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    return { 
      totalRooms, 
      totalMessages, 
      messagesToday, 
      messagesThisWeek 
    };
  }

  /**
   * Get server statistics
   */
  async getServerStats() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      cpu: cpuUsage,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics() {
    const [activeConnections, onlineUsers, memoryUsage] = await Promise.all([
      this.getActiveConnectionCount(),
      User.countDocuments({ isOnline: true }),
      Promise.resolve(process.memoryUsage())
    ]);

    return {
      activeConnections,
      onlineUsers,
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      uptime: process.uptime()
    };
  }

  /**
   * Get active connection count
   */
  async getActiveConnectionCount() {
    return this.io.engine.clientsCount || 0;
  }

  // Additional helper methods for admin actions, analytics, etc.
  // ... (implementation continues with other methods)
}

module.exports = DashboardSocketHandler;