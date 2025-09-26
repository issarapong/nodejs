/**
 * Chat Socket Handlers
 * จัดการ real-time chat events
 */

const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');
const redisClient = require('../config/redis');
const { socketValidation, socketRateLimit } = require('../middleware/socketAuth');

class ChatSocketHandler {
  constructor(io) {
    this.io = io;
  }

  /**
   * Handle chat socket connections
   */
  handleConnection(socket) {
    console.log(`🔌 Chat socket connected: ${socket.id} (User: ${socket.username})`);

    // เข้าร่วม personal room
    socket.join(`user:${socket.userId}`);

    // อัพเดทสถานะออนไลน์
    this.updateUserOnlineStatus(socket, true);

    // ลงทะเบียน event handlers
    this.registerEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * ลงทะเบียน event handlers สำหรับ chat
   */
  registerEventHandlers(socket) {
    // Join room
    socket.on('join_room', (data, callback) => {
      this.handleJoinRoom(socket, data, callback);
    });

    // Leave room  
    socket.on('leave_room', (data, callback) => {
      this.handleLeaveRoom(socket, data, callback);
    });

    // Send message
    socket.on('send_message', 
      socketRateLimit({ maxRequests: 30, windowMs: 60000 }),
      (data, callback) => {
        socketValidation.message(socket, data, (error) => {
          if (error) {
            return callback?.({ success: false, message: error.message });
          }
          this.handleSendMessage(socket, data, callback);
        });
      }
    );

    // Typing indicators
    socket.on('typing_start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Message reactions
    socket.on('add_reaction', (data, callback) => {
      this.handleAddReaction(socket, data, callback);
    });

    socket.on('remove_reaction', (data, callback) => {
      this.handleRemoveReaction(socket, data, callback);
    });

    // Mark message as read
    socket.on('mark_read', (data) => {
      this.handleMarkRead(socket, data);
    });

    // Edit message
    socket.on('edit_message', (data, callback) => {
      this.handleEditMessage(socket, data, callback);
    });

    // Delete message
    socket.on('delete_message', (data, callback) => {
      this.handleDeleteMessage(socket, data, callback);
    });

    // Get online users in room
    socket.on('get_online_users', (data, callback) => {
      this.handleGetOnlineUsers(socket, data, callback);
    });
  }

  /**
   * Handle join room
   */
  async handleJoinRoom(socket, data, callback) {
    try {
      const { roomId } = data;

      // ตรวจสอบห้อง
      const room = await Room.findById(roomId);
      if (!room) {
        return callback?.({ success: false, message: 'Room not found' });
      }

      // ตรวจสอบสิทธิ์
      const isMember = room.isMember(socket.userId);
      if (room.isPrivate && !isMember) {
        return callback?.({ success: false, message: 'Access denied to private room' });
      }

      // เข้าร่วมห้อง (Socket.io room)
      await socket.join(`room:${roomId}`);
      
      // อัพเดทสถานะสมาชิกออนไลน์
      if (isMember) {
        await room.updateMemberOnlineStatus(socket.userId, true);
      }

      // Broadcast user joined
      socket.to(`room:${roomId}`).emit('user_joined_room', {
        roomId,
        user: {
          id: socket.userId,
          username: socket.username,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar
        },
        timestamp: new Date()
      });

      // ส่ง online users ในห้อง
      const onlineUsers = await this.getOnlineUsersInRoom(roomId);
      
      callback?.({ 
        success: true, 
        message: 'Joined room successfully',
        data: {
          roomId,
          onlineUsers
        }
      });

      console.log(`👥 User ${socket.username} joined room ${room.name}`);

    } catch (error) {
      console.error('Join room error:', error);
      callback?.({ success: false, message: 'Failed to join room' });
    }
  }

  /**
   * Handle leave room
   */
  async handleLeaveRoom(socket, data, callback) {
    try {
      const { roomId } = data;

      // ออกจากห้อง (Socket.io room)
      await socket.leave(`room:${roomId}`);
      
      // อัพเดทสถานะสมาชิก
      const room = await Room.findById(roomId);
      if (room && room.isMember(socket.userId)) {
        await room.updateMemberOnlineStatus(socket.userId, false);
      }

      // Broadcast user left
      socket.to(`room:${roomId}`).emit('user_left_room', {
        roomId,
        user: {
          id: socket.userId,
          username: socket.username
        },
        timestamp: new Date()
      });

      callback?.({ success: true, message: 'Left room successfully' });
      
      console.log(`👋 User ${socket.username} left room ${roomId}`);

    } catch (error) {
      console.error('Leave room error:', error);
      callback?.({ success: false, message: 'Failed to leave room' });
    }
  }

  /**
   * Handle send message
   */
  async handleSendMessage(socket, data, callback) {
    try {
      const { roomId, content, type = 'text', replyTo, media } = data;

      // ตรวจสอบห้อง
      const room = await Room.findById(roomId);
      if (!room) {
        return callback?.({ success: false, message: 'Room not found' });
      }

      // ตรวจสอบสิทธิ์
      if (!room.isMember(socket.userId) && !socket.user.roles.includes('admin')) {
        return callback?.({ success: false, message: 'Not a member of this room' });
      }

      // สร้างข้อความ
      const message = new Message({
        content,
        type,
        sender: socket.userId,
        room: roomId,
        replyTo,
        media,
        metadata: {
          clientId: data.clientId,
          platform: 'web',
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent']
        }
      });

      await message.save();

      // Populate ข้อมูล
      await message.populate([
        { path: 'sender', select: 'username firstName lastName avatar' },
        { path: 'replyTo', select: 'content sender type createdAt' }
      ]);

      // อัพเดทห้อง
      await room.updateLastMessage(message._id, socket.userId);

      // Broadcast ข้อความ
      this.io.to(`room:${roomId}`).emit('message_received', {
        id: message._id,
        content: message.content,
        type: message.type,
        sender: message.sender,
        room: roomId,
        replyTo: message.replyTo,
        media: message.media,
        reactions: message.reactions,
        createdAt: message.createdAt,
        isEdited: message.isEdited
      });

      // อัพเดทสถิติผู้ใช้
      await socket.user.incrementMessagesSent();

      // ส่งการแจ้งเตือนให้สมาชิกที่ offline
      this.sendOfflineNotifications(room, message, socket.user);

      callback?.({ success: true, data: { messageId: message._id } });

      console.log(`💬 Message sent by ${socket.username} in room ${room.name}`);

    } catch (error) {
      console.error('Send message error:', error);
      callback?.({ success: false, message: 'Failed to send message' });
    }
  }

  /**
   * Handle typing indicators
   */
  async handleTypingStart(socket, data) {
    try {
      const { roomId } = data;
      
      socket.to(`room:${roomId}`).emit('typing_indicator', {
        roomId,
        user: {
          id: socket.userId,
          username: socket.username,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName
        },
        isTyping: true,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Typing start error:', error);
    }
  }

  /**
   * Handle stop typing
   */
  async handleTypingStop(socket, data) {
    try {
      const { roomId } = data;
      
      socket.to(`room:${roomId}`).emit('typing_indicator', {
        roomId,
        user: {
          id: socket.userId,
          username: socket.username
        },
        isTyping: false,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Typing stop error:', error);
    }
  }

  /**
   * Handle add reaction
   */
  async handleAddReaction(socket, data, callback) {
    try {
      const { messageId, emoji } = data;

      const message = await Message.findById(messageId)
        .populate('room', 'members');

      if (!message) {
        return callback?.({ success: false, message: 'Message not found' });
      }

      // ตรวจสอบสิทธิ์
      const room = message.room;
      if (!room.isMember(socket.userId)) {
        return callback?.({ success: false, message: 'Access denied' });
      }

      await message.addReaction(socket.userId, emoji);

      // Broadcast reaction
      this.io.to(`room:${message.room._id}`).emit('reaction_added', {
        messageId: message._id,
        user: {
          id: socket.userId,
          username: socket.username,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar
        },
        emoji,
        timestamp: new Date()
      });

      callback?.({ success: true });

    } catch (error) {
      console.error('Add reaction error:', error);
      callback?.({ success: false, message: 'Failed to add reaction' });
    }
  }

  /**
   * Handle remove reaction
   */
  async handleRemoveReaction(socket, data, callback) {
    try {
      const { messageId, emoji } = data;

      const message = await Message.findById(messageId)
        .populate('room', 'members');

      if (!message) {
        return callback?.({ success: false, message: 'Message not found' });
      }

      await message.removeReaction(socket.userId, emoji);

      // Broadcast reaction removal
      this.io.to(`room:${message.room._id}`).emit('reaction_removed', {
        messageId: message._id,
        user: {
          id: socket.userId,
          username: socket.username
        },
        emoji,
        timestamp: new Date()
      });

      callback?.({ success: true });

    } catch (error) {
      console.error('Remove reaction error:', error);
      callback?.({ success: false, message: 'Failed to remove reaction' });
    }
  }

  /**
   * Handle mark message as read
   */
  async handleMarkRead(socket, data) {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (!message) return;

      await message.markAsRead(socket.userId);
      await message.markAsDelivered(socket.userId);

      // อัพเดทสถิติผู้ใช้
      if (message.sender.toString() !== socket.userId) {
        await socket.user.incrementMessagesReceived();
      }

      // Notify sender
      this.io.to(`user:${message.sender}`).emit('message_read', {
        messageId: message._id,
        reader: {
          id: socket.userId,
          username: socket.username,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName
        },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Mark read error:', error);
    }
  }

  /**
   * Handle edit message
   */
  async handleEditMessage(socket, data, callback) {
    try {
      const { messageId, content } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        return callback?.({ success: false, message: 'Message not found' });
      }

      // ตรวจสอบสิทธิ์ (เฉพาะเจ้าของข้อความหรือ admin)
      if (message.sender.toString() !== socket.userId && !socket.user.roles.includes('admin')) {
        return callback?.({ success: false, message: 'Permission denied' });
      }

      await message.editContent(content);

      // Broadcast edit
      this.io.to(`room:${message.room}`).emit('message_edited', {
        messageId: message._id,
        content: message.content,
        isEdited: true,
        editedAt: new Date(),
        editor: {
          id: socket.userId,
          username: socket.username
        }
      });

      callback?.({ success: true });

    } catch (error) {
      console.error('Edit message error:', error);
      callback?.({ success: false, message: 'Failed to edit message' });
    }
  }

  /**
   * Handle delete message
   */
  async handleDeleteMessage(socket, data, callback) {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        return callback?.({ success: false, message: 'Message not found' });
      }

      // ตรวจสอบสิทธิ์
      const canDelete = message.sender.toString() === socket.userId || 
                       socket.user.roles.includes('admin') ||
                       socket.user.roles.includes('moderator');

      if (!canDelete) {
        return callback?.({ success: false, message: 'Permission denied' });
      }

      await message.softDelete(socket.userId);

      // Broadcast deletion
      this.io.to(`room:${message.room}`).emit('message_deleted', {
        messageId: message._id,
        deletedBy: {
          id: socket.userId,
          username: socket.username
        },
        timestamp: new Date()
      });

      callback?.({ success: true });

    } catch (error) {
      console.error('Delete message error:', error);
      callback?.({ success: false, message: 'Failed to delete message' });
    }
  }

  /**
   * Handle get online users in room
   */
  async handleGetOnlineUsers(socket, data, callback) {
    try {
      const { roomId } = data;
      
      const onlineUsers = await this.getOnlineUsersInRoom(roomId);
      
      callback?.({ 
        success: true, 
        data: { 
          roomId, 
          onlineUsers,
          count: onlineUsers.length 
        } 
      });

    } catch (error) {
      console.error('Get online users error:', error);
      callback?.({ success: false, message: 'Failed to get online users' });
    }
  }

  /**
   * Handle disconnection
   */
  async handleDisconnection(socket) {
    try {
      console.log(`🔌 Chat socket disconnected: ${socket.id} (User: ${socket.username})`);

      // อัพเดทสถานะออนไลน์
      await this.updateUserOnlineStatus(socket, false);

      // อัพเดทสถานะในห้องทั้งหมด
      const userRooms = await Room.find({
        'members.user': socket.userId
      });

      for (const room of userRooms) {
        await room.updateMemberOnlineStatus(socket.userId, false);
        
        // Broadcast user offline
        socket.to(`room:${room._id}`).emit('user_offline', {
          roomId: room._id,
          user: {
            id: socket.userId,
            username: socket.username
          },
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Disconnection handling error:', error);
    }
  }

  /**
   * อัพเดทสถานะออนไลน์ของผู้ใช้
   */
  async updateUserOnlineStatus(socket, isOnline) {
    try {
      if (isOnline) {
        await socket.user.setOnline(socket.id);
        await redisClient.setUserOnline(socket.userId, socket.id);
      } else {
        await socket.user.setOffline(socket.id);
        await redisClient.setUserOffline(socket.userId, socket.id);
      }
    } catch (error) {
      console.error('Update online status error:', error);
    }
  }

  /**
   * ดึงผู้ใช้ออนไลน์ในห้อง
   */
  async getOnlineUsersInRoom(roomId) {
    try {
      const room = await Room.findById(roomId)
        .populate({
          path: 'members.user',
          select: 'username firstName lastName avatar isOnline lastSeen'
        });

      if (!room) return [];

      return room.members
        .filter(member => member.isOnline)
        .map(member => ({
          id: member.user._id,
          username: member.user.username,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          avatar: member.user.avatar,
          role: member.role,
          isOnline: member.user.isOnline,
          lastSeen: member.user.lastSeen
        }));

    } catch (error) {
      console.error('Get online users error:', error);
      return [];
    }
  }

  /**
   * ส่งการแจ้งเตือนให้สมาชิกที่ offline
   */
  async sendOfflineNotifications(room, message, sender) {
    try {
      const offlineMembers = room.members
        .filter(member => 
          !member.isOnline && 
          member.user.toString() !== sender._id.toString()
        );

      for (const member of offlineMembers) {
        // สร้างการแจ้งเตือนในฐานข้อมูล
        const Notification = require('../models/Notification');
        
        await Notification.createNotification({
          recipient: member.user,
          sender: sender._id,
          type: 'message',
          title: `New message in ${room.name}`,
          message: message.content.length > 50 
            ? message.content.substring(0, 50) + '...'
            : message.content,
          priority: 'normal',
          category: 'chat',
          relatedTo: {
            model: 'Message',
            id: message._id,
            data: { roomId: room._id, roomName: room.name }
          },
          action: {
            type: 'navigate',
            url: `/chat/rooms/${room._id}`
          }
        });
      }

    } catch (error) {
      console.error('Send offline notifications error:', error);
    }
  }
}

module.exports = ChatSocketHandler;