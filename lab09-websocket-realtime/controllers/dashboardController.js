/**
 * Dashboard Controller
 * จัดการ API endpoints สำหรับ real-time dashboard
 */

const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

class DashboardController {
  /**
   * ดึงสถิติโดยรวมของระบบ
   */
  async getSystemMetrics(req, res) {
    try {
      // ดึงสถิติพื้นฐาน
      const [userStats, roomStats, messageCount, notificationCount] = await Promise.all([
        User.getUserStats(),
        Room.getRoomStats(), 
        Message.countDocuments(),
        Notification.countDocuments()
      ]);

      // ดึงสถิติเพิ่มเติม
      const onlineUsers = await User.find({ isOnline: true }).countDocuments();
      const activeRooms = await Room.find({ 
        status: 'active',
        'lastMessage.timestamp': { 
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // ภายใน 24 ชั่วโมง
        }
      }).countDocuments();

      // คำนวณสถิติ real-time
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        messagesLast24h,
        messagesLastHour,
        newUsersToday,
        activeUsersToday
      ] = await Promise.all([
        Message.countDocuments({ 
          createdAt: { $gte: last24Hours },
          isDeleted: false 
        }),
        Message.countDocuments({ 
          createdAt: { $gte: lastHour },
          isDeleted: false 
        }),
        User.countDocuments({
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
        }),
        User.countDocuments({
          lastActivity: { $gte: last24Hours }
        })
      ]);

      const metrics = {
        users: {
          total: userStats[0]?.totalUsers || 0,
          active: userStats[0]?.activeUsers || 0,
          online: onlineUsers,
          newToday: newUsersToday,
          activeToday: activeUsersToday
        },
        rooms: {
          total: roomStats[0]?.totalRooms || 0,
          active: roomStats[0]?.activeRooms || 0,
          public: roomStats[0]?.publicRooms || 0,
          activeNow: activeRooms
        },
        messages: {
          total: messageCount,
          last24Hours: messagesLast24h,
          lastHour: messagesLastHour,
          averagePerDay: Math.round(messageCount / Math.max(1, (Date.now() - new Date('2024-01-01').getTime()) / (24 * 60 * 60 * 1000)))
        },
        notifications: {
          total: notificationCount,
          unreadTotal: await Notification.countDocuments({ isRead: false })
        },
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: now
        }
      };

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('getSystemMetrics error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติระบบ'
      });
    }
  }

  /**
   * ดึงสถิติผู้ใช้
   */
  async getUserMetrics(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      // คำนวณช่วงเวลา
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // ดึงข้อมูลผู้ใช้ที่ลงทะเบียนใหม่
      const newUsers = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // ดึงข้อมูลผู้ใช้ที่ active
      const activeUsers = await User.aggregate([
        {
          $match: {
            lastActivity: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$lastActivity" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // ดึงผู้ใช้ที่ active ที่สุด
      const topActiveUsers = await User.getTopActiveUsers(10);

      // ดึงสถิติ online/offline
      const onlineCount = await User.countDocuments({ isOnline: true });
      const totalCount = await User.countDocuments({ status: 'active' });

      res.json({
        success: true,
        data: {
          period,
          newUsers,
          activeUsers,
          topActiveUsers,
          onlineStatus: {
            online: onlineCount,
            offline: totalCount - onlineCount,
            total: totalCount
          }
        }
      });

    } catch (error) {
      console.error('getUserMetrics error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติผู้ใช้'
      });
    }
  }

  /**
   * ดึงสถิติข้อความ
   */
  async getMessageMetrics(req, res) {
    try {
      const { period = '7d', roomId } = req.query;
      
      // คำนวณช่วงเวลา
      const now = new Date();
      let startDate;
      let groupFormat;
      
      switch (period) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          groupFormat = "%Y-%m-%d %H:00";
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupFormat = "%Y-%m-%d";
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupFormat = "%Y-%m-%d";
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupFormat = "%Y-%m-%d";
      }

      // สร้าง match condition
      const matchCondition = {
        createdAt: { $gte: startDate },
        isDeleted: false
      };

      if (roomId) {
        matchCondition.room = mongoose.Types.ObjectId(roomId);
      }

      // ดึงสถิติข้อความต่อวัน/ชั่วโมง
      const messageStats = await Message.aggregate([
        {
          $match: matchCondition
        },
        {
          $group: {
            _id: {
              $dateToString: { format: groupFormat, date: "$createdAt" }
            },
            count: { $sum: 1 },
            users: { $addToSet: "$sender" }
          }
        },
        {
          $addFields: {
            activeUsers: { $size: "$users" }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // ดึงสถิติตามประเภทข้อความ
      const messageTypes = await Message.aggregate([
        {
          $match: matchCondition
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // ดึงห้องที่มีข้อความมากที่สุด
      const topRooms = await Message.aggregate([
        {
          $match: matchCondition
        },
        {
          $group: {
            _id: "$room",
            messageCount: { $sum: 1 },
            users: { $addToSet: "$sender" }
          }
        },
        {
          $lookup: {
            from: 'rooms',
            localField: '_id',
            foreignField: '_id',
            as: 'roomInfo'
          }
        },
        {
          $unwind: '$roomInfo'
        },
        {
          $project: {
            roomId: '$_id',
            roomName: '$roomInfo.name',
            messageCount: 1,
            activeUsers: { $size: '$users' }
          }
        },
        {
          $sort: { messageCount: -1 }
        },
        {
          $limit: 10
        }
      ]);

      res.json({
        success: true,
        data: {
          period,
          messageStats,
          messageTypes,
          topRooms
        }
      });

    } catch (error) {
      console.error('getMessageMetrics error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติข้อความ'
      });
    }
  }

  /**
   * ดึงสถิติห้องแชท
   */
  async getRoomMetrics(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      const now = new Date();
      const startDate = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

      // ดึงห้องที่ได้รับความนิยมมากที่สุด
      const popularRooms = await Room.getPopularRooms(10);

      // ดึงห้องที่สร้างใหม่
      const newRooms = await Room.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // ดึงสถิติตามประเภทห้อง
      const roomTypes = await Room.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            averageMembers: { $avg: "$stats.totalMembers" }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // ดึงห้องที่มีสมาชิกออนไลน์มากที่สุด
      const mostActiveRooms = await Room.aggregate([
        {
          $match: {
            status: 'active'
          }
        },
        {
          $project: {
            name: 1,
            type: 1,
            totalMembers: '$stats.totalMembers',
            onlineMembers: {
              $size: {
                $filter: {
                  input: '$members',
                  cond: { $eq: ['$$this.isOnline', true] }
                }
              }
            }
          }
        },
        {
          $sort: { onlineMembers: -1 }
        },
        {
          $limit: 10
        }
      ]);

      res.json({
        success: true,
        data: {
          period,
          popularRooms,
          newRooms,
          roomTypes,
          mostActiveRooms
        }
      });

    } catch (error) {
      console.error('getRoomMetrics error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติห้องแชท'
      });
    }
  }

  /**
   * ดึงรายงานประสิทธิภาพระบบ
   */
  async getSystemPerformance(req, res) {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      const memoryStats = {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      };

      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();

      // Database connection stats
      const dbStats = {
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      };

      // Active connections (if available)
      const io = req.app.get('io');
      const socketStats = {
        connectedSockets: io ? io.sockets.sockets.size : 0,
        rooms: io ? io.sockets.adapter.rooms.size : 0
      };

      // Response times (simplified - would need more complex monitoring in production)
      const responseTimeStats = {
        average: Math.random() * 100 + 50, // Mock data
        p95: Math.random() * 200 + 100,
        p99: Math.random() * 500 + 200
      };

      res.json({
        success: true,
        data: {
          timestamp: new Date(),
          uptime: process.uptime(),
          memory: memoryStats,
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          database: dbStats,
          sockets: socketStats,
          responseTime: responseTimeStats,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      });

    } catch (error) {
      console.error('getSystemPerformance error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประสิทธิภาพระบบ'
      });
    }
  }

  /**
   * ดึงข้อมูลสำหรับ real-time charts
   */
  async getChartData(req, res) {
    try {
      const { type, period = '24h' } = req.query;
      
      const now = new Date();
      let startDate, groupFormat;
      
      switch (period) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          groupFormat = "%Y-%m-%d %H:%M";
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          groupFormat = "%Y-%m-%d %H:00";
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupFormat = "%Y-%m-%d";
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          groupFormat = "%Y-%m-%d %H:00";
      }

      let chartData = [];

      switch (type) {
        case 'messages':
          chartData = await Message.aggregate([
            {
              $match: {
                createdAt: { $gte: startDate },
                isDeleted: false
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: groupFormat, date: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { _id: 1 }
            }
          ]);
          break;

        case 'users':
          chartData = await User.aggregate([
            {
              $match: {
                lastActivity: { $gte: startDate }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: groupFormat, date: "$lastActivity" }
                },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { _id: 1 }
            }
          ]);
          break;

        case 'online':
          // For real-time online users, we'd typically use Redis or similar
          // This is a simplified version
          chartData = [{
            _id: new Date().toISOString().substring(0, 16),
            count: await User.countDocuments({ isOnline: true })
          }];
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'ประเภท chart ไม่ถูกต้อง'
          });
      }

      res.json({
        success: true,
        data: {
          type,
          period,
          chartData,
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('getChartData error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล chart'
      });
    }
  }
}

module.exports = new DashboardController();