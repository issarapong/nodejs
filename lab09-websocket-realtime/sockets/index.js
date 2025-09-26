/**
 * Main Socket.io Server Configuration
 * จัดการการเชื่อมต่อ WebSocket หลัก
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redisClient = require('../config/redis');
const { socketAuth } = require('../middleware/socketAuth');

// Socket handlers
const ChatSocketHandler = require('./chatSocket');
const NotificationSocketHandler = require('./notificationSocket');
const DashboardSocketHandler = require('./dashboardSocket');

class SocketServer {
  constructor(server) {
    this.server = server;
    this.io = null;
    this.chatHandler = null;
    this.notificationHandler = null;
    this.dashboardHandler = null;
    this.connectedUsers = new Map();
    this.rooms = new Map();
  }

  /**
   * เริ่มต้น Socket.io server
   */
  initialize() {
    // สร้าง Socket.io server
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e6, // 1MB
      allowRequest: this.allowRequest.bind(this)
    });

    // สร้าง socket handlers
    this.chatHandler = new ChatSocketHandler(this.io);
    this.notificationHandler = new NotificationSocketHandler(this.io);
    this.dashboardHandler = new DashboardSocketHandler(this.io);

    // ตั้งค่า middleware สำหรับ authentication
    this.setupMiddleware();

    // ตั้งค่า namespaces
    this.setupNamespaces();

    // ตั้งค่า connection handlers
    this.setupConnectionHandlers();

    // ตั้งค่า error handlers
    this.setupErrorHandlers();

    // ตั้งค่า monitoring
    this.setupMonitoring();

    console.log('🚀 Socket.io server initialized successfully');

    return this.io;
  }

  /**
   * ตั้งค่า middleware สำหรับ authentication
   */
  setupMiddleware() {
    // Global authentication middleware
    this.io.use(async (socket, next) => {
      try {
        await this.authenticateSocket(socket);
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      socket.rateLimits = new Map();
      next();
    });

    // Connection logging middleware
    this.io.use((socket, next) => {
      console.log(`🔌 Socket connection attempt: ${socket.id} from ${socket.handshake.address}`);
      next();
    });
  }

  /**
   * ตั้งค่า namespaces สำหรับแยกประเภทการเชื่อมต่อ
   */
  setupNamespaces() {
    // Chat namespace
    const chatNamespace = this.io.of('/chat');
    chatNamespace.use(socketAuth);
    chatNamespace.on('connection', (socket) => {
      this.chatHandler.handleConnection(socket);
    });

    // Notifications namespace  
    const notificationNamespace = this.io.of('/notifications');
    notificationNamespace.use(socketAuth);
    notificationNamespace.on('connection', (socket) => {
      this.notificationHandler.handleConnection(socket);
    });

    // Dashboard namespace (admin only)
    const dashboardNamespace = this.io.of('/dashboard');
    dashboardNamespace.use(socketAuth);
    dashboardNamespace.use((socket, next) => {
      // ตรวจสอบสิทธิ์ admin
      if (!socket.user.roles.includes('admin') && !socket.user.roles.includes('moderator')) {
        return next(new Error('Admin access required'));
      }
      next();
    });
    dashboardNamespace.on('connection', (socket) => {
      this.dashboardHandler.handleConnection(socket);
    });

    console.log('📡 Socket.io namespaces configured');
  }

  /**
   * ตั้งค่า connection handlers หลัก
   */
  setupConnectionHandlers() {
    // Main namespace connection handler
    this.io.on('connection', (socket) => {
      this.handleMainConnection(socket);
    });

    // Connection event logging
    this.io.engine.on('connection_error', (err) => {
      console.error('Socket.io connection error:', err);
    });
  }

  /**
   * Handle main namespace connections
   */
  async handleMainConnection(socket) {
    try {
      console.log(`🔌 Main socket connected: ${socket.id} (User: ${socket.username})`);

      // Track connected user
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        username: socket.username,
        connectedAt: new Date(),
        namespace: 'main'
      });

      // เข้าร่วม user room
      socket.join(`user:${socket.userId}`);

      // ส่งข้อมูลเริ่มต้น
      socket.emit('connection_established', {
        message: 'Connected successfully',
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date(),
        server: {
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });

      // Handle general events
      this.registerGeneralEvents(socket);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleMainDisconnection(socket, reason);
      });

    } catch (error) {
      console.error('Main connection handling error:', error);
      socket.emit('connection_error', { message: 'Connection failed' });
      socket.disconnect();
    }
  }

  /**
   * ลงทะเบียน general events
   */
  registerGeneralEvents(socket) {
    // Ping/Pong for connection health check
    socket.on('ping', (callback) => {
      callback?.({ message: 'pong', timestamp: new Date() });
    });

    // User presence updates
    socket.on('update_presence', async (data) => {
      try {
        await this.updateUserPresence(socket.userId, data.status, data.customMessage);
        
        // Broadcast presence update
        socket.broadcast.emit('user_presence_updated', {
          userId: socket.userId,
          username: socket.username,
          status: data.status,
          customMessage: data.customMessage,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Update presence error:', error);
      }
    });

    // Join room
    socket.on('join_room', async (data, callback) => {
      try {
        const { roomId, roomType = 'chat' } = data;
        
        await socket.join(`${roomType}:${roomId}`);
        
        // Track room membership
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(socket.userId);

        callback?.({ success: true, message: `Joined ${roomType} room: ${roomId}` });
        
        console.log(`👥 User ${socket.username} joined ${roomType} room: ${roomId}`);

      } catch (error) {
        console.error('Join room error:', error);
        callback?.({ success: false, message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave_room', async (data, callback) => {
      try {
        const { roomId, roomType = 'chat' } = data;
        
        await socket.leave(`${roomType}:${roomId}`);
        
        // Remove room membership tracking
        if (this.rooms.has(roomId)) {
          this.rooms.get(roomId).delete(socket.userId);
          if (this.rooms.get(roomId).size === 0) {
            this.rooms.delete(roomId);
          }
        }

        callback?.({ success: true, message: `Left ${roomType} room: ${roomId}` });
        
        console.log(`👋 User ${socket.username} left ${roomType} room: ${roomId}`);

      } catch (error) {
        console.error('Leave room error:', error);
        callback?.({ success: false, message: 'Failed to leave room' });
      }
    });

    // Get server info
    socket.on('get_server_info', (callback) => {
      callback?.({
        success: true,
        data: {
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          connectedUsers: this.connectedUsers.size,
          activeRooms: this.rooms.size,
          timestamp: new Date()
        }
      });
    });

    // Client error reporting
    socket.on('client_error', (errorData) => {
      console.error('Client error reported:', {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id,
        error: errorData,
        timestamp: new Date()
      });
    });
  }

  /**
   * Handle main disconnection
   */
  async handleMainDisconnection(socket, reason) {
    try {
      console.log(`🔌 Main socket disconnected: ${socket.id} (User: ${socket.username}, Reason: ${reason})`);

      // Remove from connected users tracking
      this.connectedUsers.delete(socket.userId);

      // Clean up room memberships
      for (const [roomId, users] of this.rooms.entries()) {
        users.delete(socket.userId);
        if (users.size === 0) {
          this.rooms.delete(roomId);
        }
      }

      // Update user offline status
      if (socket.user) {
        await socket.user.setOffline(socket.id);
        await redisClient.setUserOffline(socket.userId, socket.id);
      }

      // Broadcast user disconnection
      socket.broadcast.emit('user_disconnected', {
        userId: socket.userId,
        username: socket.username,
        reason,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Main disconnection handling error:', error);
    }
  }

  /**
   * Socket authentication
   */
  async authenticateSocket(socket) {
    const token = socket.handshake.auth?.token || 
                 socket.handshake.query?.token ||
                 socket.request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id)
        .select('+password +settings +permissions')
        .populate('profile');

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Attach user data to socket
      socket.userId = user._id.toString();
      socket.username = user.username;
      socket.user = user;

      console.log(`✅ Socket authenticated: ${socket.username} (${socket.id})`);

    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Allow request validation
   */
  allowRequest(req, callback) {
    // ตรวจสอบ origin
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    
    if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
      return callback('Origin not allowed', false);
    }

    // ตรวจสอบ rate limiting (basic)
    const ip = req.socket.remoteAddress;
    // TODO: Implement more sophisticated rate limiting
    
    callback(null, true);
  }

  /**
   * อัพเดท user presence
   */
  async updateUserPresence(userId, status, customMessage) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          'presence.status': status,
          'presence.customMessage': customMessage,
          'presence.lastUpdated': new Date()
        },
        { new: true }
      );

      // Update in Redis
      await redisClient.setUserPresence(userId, { status, customMessage });

      return user;

    } catch (error) {
      console.error('Update user presence error:', error);
      throw error;
    }
  }

  /**
   * ตั้งค่า error handlers
   */
  setupErrorHandlers() {
    this.io.engine.on('connection_error', (err) => {
      console.error('Socket.io connection error:', {
        message: err.message,
        type: err.type,
        description: err.description,
        context: err.context,
        req: err.req ? {
          url: err.req.url,
          headers: err.req.headers,
          method: err.req.method
        } : null
      });
    });

    // Handle uncaught errors in socket handlers
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception in Socket Server:', error);
      // Gracefully close server
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection in Socket Server:', reason);
    });
  }

  /**
   * ตั้งค่า monitoring
   */
  setupMonitoring() {
    // Connection monitoring
    setInterval(() => {
      const stats = {
        connectedClients: this.io.engine.clientsCount,
        activeRooms: this.rooms.size,
        connectedUsers: this.connectedUsers.size,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date()
      };

      console.log('📊 Socket.io Stats:', stats);

      // Emit to dashboard if admins connected
      this.io.of('/dashboard').emit('server_stats_update', stats);

    }, 30000); // Every 30 seconds

    console.log('📊 Socket.io monitoring setup complete');
  }

  /**
   * ส่งข้อความแบบ broadcast
   */
  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * ส่งข้อความให้ผู้ใช้คนหนึ่ง
   */
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * ส่งข้อความให้ห้องหนึ่ง
   */
  sendToRoom(roomId, event, data) {
    this.io.to(`chat:${roomId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * ดึงข้อมูลสถิติ server
   */
  getServerStats() {
    return {
      connectedClients: this.io.engine.clientsCount,
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.rooms.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    try {
      console.log('🛑 Starting graceful shutdown of Socket.io server...');

      // Notify all connected clients
      this.broadcastToAll('server_shutdown', {
        message: 'Server is shutting down for maintenance',
        timestamp: new Date()
      });

      // Wait for clients to disconnect
      setTimeout(() => {
        this.io.close(() => {
          console.log('✅ Socket.io server closed');
          process.exit(0);
        });
      }, 5000);

    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get Socket.io instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Get handlers
   */
  getHandlers() {
    return {
      chat: this.chatHandler,
      notification: this.notificationHandler,
      dashboard: this.dashboardHandler
    };
  }
}

module.exports = SocketServer;