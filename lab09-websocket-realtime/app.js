/**
 * Main Application Server
 * จัดการ Express server และ Socket.io integration
 */

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Database connection
const connectDB = require('./config/database');
const connectRedis = require('./config/redis');

// Socket server
const SocketServer = require('./sockets');

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');

// Middleware
const { protect } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Utilities
const logger = require('./utils/logger');

class App {
  constructor() {
    this.app = express();
    this.server = null;
    this.socketServer = null;
    this.port = process.env.PORT || 5000;
  }

  /**
   * เริ่มต้นแอปพลิเคชัน
   */
  async initialize() {
    try {
      // เชื่อมต่อฐานข้อมูล
      await this.connectDatabases();

      // ตั้งค่า Express app
      this.setupExpress();

      // ตั้งค่า middleware
      this.setupMiddleware();

      // ตั้งค่า routes
      this.setupRoutes();

      // ตั้งค่า static files และ views
      this.setupStaticFiles();

      // ตั้งค่า error handling
      this.setupErrorHandling();

      // สร้าง HTTP server
      this.createServer();

      // ตั้งค่า Socket.io
      this.setupSocketIO();

      console.log('🚀 Application initialized successfully');

    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      process.exit(1);
    }
  }

  /**
   * เชื่อมต่อฐานข้อมูล
   */
  async connectDatabases() {
    try {
      // Connect MongoDB
      await connectDB();
      console.log('✅ MongoDB connected');

      // Connect Redis
      await connectRedis();
      console.log('✅ Redis connected');

    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * ตั้งค่า Express
   */
  setupExpress() {
    // Trust proxy (สำหรับ production)
    if (process.env.NODE_ENV === 'production') {
      this.app.set('trust proxy', 1);
    }

    // View engine setup (ถ้าต้องการใช้ server-side rendering)
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
  }

  /**
   * ตั้งค่า middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", "ws:", "wss:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Data sanitization
    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());

    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', { stream: logger.stream }));
    }

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      }
    });
    this.app.use(limiter);

    // Custom middleware for request tracking
    this.app.use((req, res, next) => {
      req.requestTime = new Date().toISOString();
      req.requestId = Math.random().toString(36).substr(2, 9);
      next();
    });
  }

  /**
   * ตั้งค่า routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API info
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Node.js WebSocket Realtime API',
        version: '1.0.0',
        description: 'Real-time chat and notification system with Socket.io',
        endpoints: {
          auth: '/api/auth',
          chat: '/api/chat',
          notifications: '/api/notifications',
          dashboard: '/api/dashboard'
        },
        websocket: {
          url: `${req.protocol}://${req.get('host')}`,
          namespaces: ['/chat', '/notifications', '/dashboard']
        },
        documentation: '/api/docs',
        timestamp: new Date().toISOString()
      });
    });

    // Main API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/chat', protect, chatRoutes);
    this.app.use('/api/notifications', protect, notificationRoutes);
    this.app.use('/api/dashboard', protect, dashboardRoutes);

    // WebSocket test page (development only)
    if (process.env.NODE_ENV === 'development') {
      this.app.get('/test', (req, res) => {
        res.render('test', { 
          title: 'WebSocket Test',
          socketUrl: `${req.protocol}://${req.get('host')}`
        });
      });
    }

    // API Documentation (ถ้ามี)
    this.app.get('/api/docs', (req, res) => {
      res.json({
        message: 'API Documentation',
        note: 'See README.md for detailed API documentation'
      });
    });

    console.log('✅ Routes configured');
  }

  /**
   * ตั้งค่า static files
   */
  setupStaticFiles() {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Serve uploaded files (with authentication)
    this.app.use('/uploads', protect, express.static(path.join(__dirname, 'uploads')));

    console.log('✅ Static files configured');
  }

  /**
   * ตั้งค่า error handling
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use(errorHandler);

    console.log('✅ Error handling configured');
  }

  /**
   * สร้าง HTTP server
   */
  createServer() {
    this.server = http.createServer(this.app);
    console.log('✅ HTTP server created');
  }

  /**
   * ตั้งค่า Socket.io
   */
  setupSocketIO() {
    this.socketServer = new SocketServer(this.server);
    this.io = this.socketServer.initialize();

    // Make Socket.io available in routes
    this.app.set('io', this.io);
    this.app.set('socketServer', this.socketServer);

    console.log('✅ Socket.io configured');
  }

  /**
   * เริ่มต้น server
   */
  start() {
    this.server.listen(this.port, () => {
      console.log(`
🚀 Server is running!

📡 HTTP Server: http://localhost:${this.port}
🔌 WebSocket: ws://localhost:${this.port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
⚡ Node.js: ${process.version}

Namespaces:
- Main: /
- Chat: /chat  
- Notifications: /notifications
- Dashboard: /dashboard (admin only)

API Endpoints:
- Health: GET /health
- Auth: /api/auth/*
- Chat: /api/chat/* 
- Notifications: /api/notifications/*
- Dashboard: /api/dashboard/*

${process.env.NODE_ENV === 'development' ? '🧪 Test page: http://localhost:' + this.port + '/test' : ''}
      `);
    });

    // Handle server errors
    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${this.port} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });

    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * ตั้งค่า graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      this.server.close(async () => {
        console.log('✅ HTTP server closed');

        try {
          // Close database connections
          if (global.mongoose) {
            await global.mongoose.connection.close();
            console.log('✅ MongoDB connection closed');
          }

          if (global.redisClient) {
            await global.redisClient.quit();
            console.log('✅ Redis connection closed');
          }

          // Close Socket.io
          if (this.socketServer) {
            await this.socketServer.gracefulShutdown();
          }

          console.log('✅ Graceful shutdown completed');
          process.exit(0);

        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get HTTP server instance  
   */
  getServer() {
    return this.server;
  }

  /**
   * Get Socket.io instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Get Socket server instance
   */
  getSocketServer() {
    return this.socketServer;
  }
}

module.exports = App;