/**
 * Chat Controller
 * จัดการ API endpoints สำหรับระบบแชท
 */

const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

class ChatController {
  /**
   * ดึงรายการห้องของผู้ใช้
   */
  async getUserRooms(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, type } = req.query;
      
      const query = {
        'members.user': userId,
        status: 'active'
      };
      
      if (type && ['private', 'group', 'public', 'channel'].includes(type)) {
        query.type = type;
      }

      const rooms = await Room.find(query)
        .populate('owner', 'username firstName lastName avatar')
        .populate('members.user', 'username firstName lastName avatar isOnline lastSeen')
        .populate('lastMessage.sender', 'username firstName lastName avatar')
        .sort({ 'lastMessage.timestamp': -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // คำนวณข้อความที่ยังไม่ได้อ่าน
      const roomsWithUnreadCount = await Promise.all(
        rooms.map(async (room) => {
          const member = room.members.find(m => m.user._id.toString() === userId);
          const lastReadDate = member?.lastSeen || room.createdAt;
          
          const unreadCount = await Message.getUnreadCount(room._id, userId, lastReadDate);
          
          return {
            ...room.toObject(),
            unreadCount
          };
        })
      );

      res.json({
        success: true,
        data: roomsWithUnreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: await Room.countDocuments(query)
        }
      });

    } catch (error) {
      console.error('getUserRooms error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการห้อง'
      });
    }
  }

  /**
   * สร้างห้องแชทใหม่
   */
  async createRoom(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { name, description, type = 'group', isPrivate = false, members = [] } = req.body;

      // ตรวจสอบชื่อห้องซ้ำ (สำหรับห้องสาธารณะ)
      if (!isPrivate) {
        const existingRoom = await Room.findByName(name);
        if (existingRoom) {
          return res.status(400).json({
            success: false,
            message: 'ชื่อห้องนี้มีอยู่แล้ว'
          });
        }
      }

      // สร้างห้องใหม่
      const room = new Room({
        name,
        description,
        type,
        isPrivate,
        owner: userId
      });

      // เพิ่มเจ้าของเป็นสมาชิกแรก
      room.members.push({
        user: userId,
        role: 'admin',
        permissions: ['send_message', 'upload_file', 'delete_message', 'kick_member', 'edit_room', 'invite_member'],
        joinedAt: new Date(),
        isOnline: true
      });

      // เพิ่มสมาชิกอื่นๆ (ถ้ามี)
      if (members.length > 0) {
        const validMembers = await User.find({ _id: { $in: members }, status: 'active' });
        
        for (const member of validMembers) {
          if (member._id.toString() !== userId) {
            room.members.push({
              user: member._id,
              role: 'member',
              permissions: ['send_message', 'upload_file'],
              joinedAt: new Date(),
              isOnline: member.isOnline
            });
          }
        }
      }

      await room.save();

      // Populate ข้อมูลสำหรับ response
      await room.populate([
        { path: 'owner', select: 'username firstName lastName avatar' },
        { path: 'members.user', select: 'username firstName lastName avatar isOnline' }
      ]);

      // สร้างข้อความระบบ
      const systemMessage = new Message({
        content: `ห้อง "${name}" ถูกสร้างโดย ${req.user.firstName} ${req.user.lastName}`,
        type: 'system',
        sender: userId,
        room: room._id,
        systemData: {
          action: 'room_created',
          metadata: { roomName: name, roomType: type }
        }
      });
      await systemMessage.save();

      // อัพเดท lastMessage ของห้อง
      room.updateLastMessage(systemMessage._id, userId);

      res.status(201).json({
        success: true,
        message: 'สร้างห้องสำเร็จ',
        data: room
      });

    } catch (error) {
      console.error('createRoom error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างห้อง'
      });
    }
  }

  /**
   * ดูรายละเอียดห้อง
   */
  async getRoomDetails(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const room = await Room.findById(roomId)
        .populate('owner', 'username firstName lastName avatar')
        .populate('members.user', 'username firstName lastName avatar isOnline lastSeen');

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบห้องที่ระบุ'
        });
      }

      // ตรวจสอบสิทธิ์ในการดูห้อง
      const isMember = room.isMember(userId);
      const isOwner = room.owner._id.toString() === userId;
      const hasAdminRole = req.user.roles.includes('admin');

      if (room.isPrivate && !isMember && !isOwner && !hasAdminRole) {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์เข้าถึงห้องนี้'
        });
      }

      res.json({
        success: true,
        data: room
      });

    } catch (error) {
      console.error('getRoomDetails error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดห้อง'
      });
    }
  }

  /**
   * เข้าร่วมห้อง
   */
  async joinRoom(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบห้องที่ระบุ'
        });
      }

      // ตรวจสอบว่าเป็นสมาชิกอยู่แล้วหรือไม่
      if (room.isMember(userId)) {
        return res.status(400).json({
          success: false,
          message: 'คุณเป็นสมาชิกของห้องนี้อยู่แล้ว'
        });
      }

      // ตรวจสอบว่าถูกแบนหรือไม่
      if (room.isBanned(userId)) {
        return res.status(403).json({
          success: false,
          message: 'คุณถูกแบนจากห้องนี้'
        });
      }

      // เพิ่มเป็นสมาชิก
      await room.addMember(userId);

      // สร้างข้อความระบบ
      const systemMessage = new Message({
        content: `${req.user.firstName} ${req.user.lastName} เข้าร่วมห้อง`,
        type: 'system',
        sender: userId,
        room: roomId,
        systemData: {
          action: 'user_joined',
          targetUser: userId
        }
      });
      await systemMessage.save();

      // อัพเดท user's joined rooms
      await User.findByIdAndUpdate(userId, {
        $addToSet: { joinedRooms: roomId }
      });

      res.json({
        success: true,
        message: 'เข้าร่วมห้องสำเร็จ'
      });

    } catch (error) {
      console.error('joinRoom error:', error);
      
      if (error.message.includes('ห้องเต็ม')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเข้าร่วมห้อง'
      });
    }
  }

  /**
   * ออกจากห้อง
   */
  async leaveRoom(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบห้องที่ระบุ'
        });
      }

      // ตรวจสอบว่าเป็นสมาชิกหรือไม่
      if (!room.isMember(userId)) {
        return res.status(400).json({
          success: false,
          message: 'คุณไม่ใช่สมาชิกของห้องนี้'
        });
      }

      // เจ้าของห้องไม่สามารถออกได้
      if (room.owner.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'เจ้าของห้องไม่สามารถออกจากห้องได้'
        });
      }

      // ลบจากสมาชิก
      await room.removeMember(userId);

      // สร้างข้อความระบบ
      const systemMessage = new Message({
        content: `${req.user.firstName} ${req.user.lastName} ออกจากห้อง`,
        type: 'system',
        sender: userId,
        room: roomId,
        systemData: {
          action: 'user_left',
          targetUser: userId
        }
      });
      await systemMessage.save();

      // อัพเดท user's joined rooms
      await User.findByIdAndUpdate(userId, {
        $pull: { joinedRooms: roomId }
      });

      res.json({
        success: true,
        message: 'ออกจากห้องสำเร็จ'
      });

    } catch (error) {
      console.error('leaveRoom error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากห้อง'
      });
    }
  }

  /**
   * ดึงประวัติข้อความ
   */
  async getRoomMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { page = 1, limit = 50, before, after } = req.query;
      const userId = req.user.id;

      // ตรวจสอบสิทธิ์เข้าถึงห้อง
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบห้องที่ระบุ'
        });
      }

      const isMember = room.isMember(userId);
      const hasAdminRole = req.user.roles.includes('admin');

      if (!isMember && !hasAdminRole) {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์เข้าถึงข้อความในห้องนี้'
        });
      }

      // สร้าง query สำหรับข้อความ
      const query = {
        room: roomId,
        isDeleted: false
      };

      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      if (after) {
        query.createdAt = { ...query.createdAt, $gt: new Date(after) };
      }

      const messages = await Message.find(query)
        .populate('sender', 'username firstName lastName avatar isOnline')
        .populate('replyTo', 'content sender type createdAt')
        .populate({
          path: 'readBy.user',
          select: 'username firstName lastName avatar'
        })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // อัพเดทข้อความที่ส่งถึงผู้ใช้
      const messageIds = messages.map(msg => msg._id);
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          sender: { $ne: userId },
          'deliveredTo.user': { $ne: userId }
        },
        {
          $push: {
            deliveredTo: {
              user: userId,
              deliveredAt: new Date()
            }
          }
        }
      );

      res.json({
        success: true,
        data: messages.reverse(), // กลับลำดับเพื่อให้เก่าสุดขึ้นก่อน
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: await Message.countDocuments({ room: roomId, isDeleted: false })
        }
      });

    } catch (error) {
      console.error('getRoomMessages error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อความ'
      });
    }
  }

  /**
   * ค้นหาข้อความ
   */
  async searchMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { q, page = 1, limit = 20 } = req.query;
      const userId = req.user.id;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุคำค้นหา'
        });
      }

      // ตรวจสอบสิทธิ์เข้าถึงห้อง
      const room = await Room.findById(roomId);
      if (!room || !room.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์เข้าถึงห้องนี้'
        });
      }

      const messages = await Message.searchMessages(roomId, q.trim(), page, limit);

      res.json({
        success: true,
        data: messages,
        query: q,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('searchMessages error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการค้นหาข้อความ'
      });
    }
  }

  /**
   * อัพโหลดไฟล์
   */
  async uploadFiles(req, res) {
    try {
      if (!req.processedFiles || req.processedFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ที่อัพโหลด'
        });
      }

      res.json({
        success: true,
        message: 'อัพโหลดไฟล์สำเร็จ',
        data: req.processedFiles
      });

    } catch (error) {
      console.error('uploadFiles error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์'
      });
    }
  }

  /**
   * ดึงห้องสาธารณะ
   */
  async getPublicRooms(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;

      let query = {
        type: { $in: ['public', 'group'] },
        isPrivate: false,
        status: 'active'
      };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const rooms = await Room.find(query)
        .populate('owner', 'username firstName lastName avatar')
        .select('name description type avatar stats memberCount onlineCount createdAt')
        .sort({ 'stats.totalMessages': -1, 'stats.totalMembers': -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      res.json({
        success: true,
        data: rooms,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: await Room.countDocuments(query)
        }
      });

    } catch (error) {
      console.error('getPublicRooms error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการห้องสาธารณะ'
      });
    }
  }
}

module.exports = new ChatController();