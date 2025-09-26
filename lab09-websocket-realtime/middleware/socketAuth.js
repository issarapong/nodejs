/**
 * Socket Authentication Middleware
 * ยืนยันตัวตนสำหรับ WebSocket connections
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io Authentication Middleware
 * ตรวจสอบ JWT token ในการเชื่อมต่อ WebSocket
 */
const socketAuth = async (socket, next) => {
  try {
    // ดึง token จาก query parameters หรือ auth header
    const token = socket.handshake.auth.token || 
                  socket.handshake.query.token ||
                  socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log(`❌ Socket ${socket.id}: No authentication token provided`);
      return next(new Error('Authentication token required'));
    }

    // ตรวจสอบ JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ค้นหาผู้ใช้ในฐานข้อมูล
    const user = await User.findById(decoded.id)
      .select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      console.log(`❌ Socket ${socket.id}: User not found for ID ${decoded.id}`);
      return next(new Error('User not found'));
    }

    if (user.status !== 'active') {
      console.log(`❌ Socket ${socket.id}: User ${user.username} is not active (status: ${user.status})`);
      return next(new Error('User account is not active'));
    }

    // เก็บข้อมูลผู้ใช้ใน socket object
    socket.userId = user._id.toString();
    socket.user = user;
    socket.username = user.username;
    socket.roles = user.roles;

    console.log(`✅ Socket ${socket.id}: Authenticated user ${user.username} (${user._id})`);
    
    next();

  } catch (error) {
    console.log(`❌ Socket ${socket.id}: Authentication failed - ${error.message}`);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid authentication token'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication token expired'));
    } else {
      return next(new Error('Authentication failed'));
    }
  }
};

/**
 * Socket Room Authorization Middleware
 * ตรวจสอบสิทธิ์ในการเข้าร่วมห้อง
 */
const socketRoomAuth = (requiredPermission = null) => {
  return async (socket, roomId, next) => {
    try {
      const Room = require('../models/Room');
      
      // ค้นหาห้อง
      const room = await Room.findById(roomId);
      if (!room) {
        return next(new Error('Room not found'));
      }

      // ตรวจสอบว่าห้องยังใช้งานได้
      if (room.status !== 'active') {
        return next(new Error('Room is not active'));
      }

      // ตรวจสอบว่าผู้ใช้ถูกแบนหรือไม่
      if (room.isBanned(socket.userId)) {
        return next(new Error('You are banned from this room'));
      }

      // ตรวจสอบสมาชิกภาพ
      const isMember = room.isMember(socket.userId);
      
      // ถ้าเป็นห้องส่วนตัวและไม่ใช่สมาชิก
      if (room.isPrivate && !isMember) {
        return next(new Error('Access denied to private room'));
      }

      // ตรวจสอบสิทธิ์เฉพาะ (ถ้ามี)
      if (requiredPermission && isMember) {
        if (!room.hasPermission(socket.userId, requiredPermission)) {
          return next(new Error(`Permission denied: ${requiredPermission}`));
        }
      }

      // เก็บข้อมูลห้องใน socket
      socket.currentRoom = room;
      socket.roomRole = room.getMemberRole(socket.userId);

      console.log(`✅ Socket ${socket.id}: Authorized for room ${room.name} (${roomId})`);
      
      next();

    } catch (error) {
      console.log(`❌ Socket ${socket.id}: Room authorization failed - ${error.message}`);
      next(new Error('Room authorization failed'));
    }
  };
};

/**
 * Socket Rate Limiting Middleware
 * จำกัดอัตราการส่งข้อความ
 */
const socketRateLimit = (options = {}) => {
  const {
    maxRequests = 30,
    windowMs = 60000, // 1 minute
    message = 'Too many requests'
  } = options;

  const requestCounts = new Map();

  return (socket, next) => {
    const userId = socket.userId;
    const now = Date.now();
    const windowStart = now - windowMs;

    // ล้างข้อมูลเก่า
    if (requestCounts.has(userId)) {
      const userRequests = requestCounts.get(userId);
      userRequests.requests = userRequests.requests.filter(time => time > windowStart);
    }

    // ตรวจสอบจำนวน requests ปัจจุบัน
    const userRequests = requestCounts.get(userId) || { requests: [] };
    
    if (userRequests.requests.length >= maxRequests) {
      console.log(`🚫 Socket ${socket.id}: Rate limit exceeded for user ${socket.username}`);
      return next(new Error(message));
    }

    // บันทึก request
    userRequests.requests.push(now);
    requestCounts.set(userId, userRequests);

    next();
  };
};

/**
 * Socket Admin Authorization Middleware
 * ตรวจสอบสิทธิ์ admin
 */
const socketAdminAuth = (socket, next) => {
  if (!socket.user || !socket.user.roles.includes('admin')) {
    console.log(`❌ Socket ${socket.id}: Admin access denied for user ${socket.username}`);
    return next(new Error('Admin access required'));
  }

  console.log(`✅ Socket ${socket.id}: Admin access granted for user ${socket.username}`);
  next();
};

/**
 * Socket Moderator Authorization Middleware
 * ตรวจสอบสิทธิ์ moderator หรือ admin
 */
const socketModeratorAuth = (socket, next) => {
  const userRoles = socket.user?.roles || [];
  const hasModeratorAccess = userRoles.includes('moderator') || userRoles.includes('admin');

  if (!hasModeratorAccess) {
    console.log(`❌ Socket ${socket.id}: Moderator access denied for user ${socket.username}`);
    return next(new Error('Moderator access required'));
  }

  console.log(`✅ Socket ${socket.id}: Moderator access granted for user ${socket.username}`);
  next();
};

/**
 * Socket Validation Middleware
 * ตรวจสอบและทำความสะอาดข้อมูล
 */
const socketValidation = {
  // ตรวจสอบข้อมูลข้อความ
  message: (socket, data, next) => {
    const { roomId, content, type = 'text' } = data;

    // ตรวจสอบ required fields
    if (!roomId) {
      return next(new Error('Room ID is required'));
    }

    if (!content && type === 'text') {
      return next(new Error('Message content is required'));
    }

    // ตรวจสอบความยาวข้อความ
    if (content && content.length > 1000) {
      return next(new Error('Message too long (max 1000 characters)'));
    }

    // ตรวจสอบประเภทข้อความ
    const allowedTypes = ['text', 'image', 'file', 'audio', 'video', 'emoji'];
    if (!allowedTypes.includes(type)) {
      return next(new Error('Invalid message type'));
    }

    // ทำความสะอาดเนื้อหา
    if (content) {
      data.content = content.trim();
    }

    next();
  },

  // ตรวจสอบข้อมูลห้อง
  room: (socket, data, next) => {
    const { name, description, type = 'group' } = data;

    if (!name || name.trim().length === 0) {
      return next(new Error('Room name is required'));
    }

    if (name.length > 100) {
      return next(new Error('Room name too long (max 100 characters)'));
    }

    if (description && description.length > 500) {
      return next(new Error('Room description too long (max 500 characters)'));
    }

    const allowedTypes = ['private', 'group', 'public', 'channel'];
    if (!allowedTypes.includes(type)) {
      return next(new Error('Invalid room type'));
    }

    // ทำความสะอาดข้อมูล
    data.name = name.trim();
    if (description) {
      data.description = description.trim();
    }

    next();
  }
};

/**
 * Socket Error Handler
 * จัดการ errors ใน socket middleware
 */
const socketErrorHandler = (error, socket, next) => {
  console.error(`🔴 Socket ${socket.id} Error:`, error.message);
  
  // ส่ง error กลับไปยัง client
  socket.emit('error', {
    message: error.message,
    code: error.code || 'SOCKET_ERROR',
    timestamp: new Date().toISOString()
  });

  // ไม่เรียก next() เพื่อหยุดการทำงาน
};

module.exports = {
  socketAuth,
  socketRoomAuth,
  socketRateLimit,
  socketAdminAuth,
  socketModeratorAuth,
  socketValidation,
  socketErrorHandler
};