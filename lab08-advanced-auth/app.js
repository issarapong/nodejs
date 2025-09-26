/**
 * App.js - Advanced Authentication Lab
 * แอพพลิเคชั่น Node.js สำหรับ Advanced Authentication & Authorization
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

// Database
const database = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');

// Middleware
const rateLimitMiddleware = require('./middleware/rateLimit');

// Services
const emailService = require('./services/emailService');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ===========================================
// Global Middleware
// ===========================================

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',');
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token']
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'));
}

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key-here-make-it-secure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 10 * 60 * 1000 // 10 minutes for temp tokens
  },
  name: 'lab8.sid' // ชื่อ session cookie
}));

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Global Rate Limiting
app.use('/api', rateLimitMiddleware.general());

// Request Info Middleware
app.use((req, res, next) => {
  req.timestamp = Date.now();
  req.requestId = require('crypto').randomBytes(8).toString('hex');
  
  // เพิ่มข้อมูล IP และ User Agent
  req.clientInfo = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  next();
});

// ===========================================
// Routes
// ===========================================

/**
 * @route   GET /
 * @desc    Home Page / API Info
 * @access  Public
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NodeJS Lab 8 - Advanced Authentication & Authorization API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      health: '/api/auth/health',
      docs: '/api/docs'
    },
    features: [
      'JWT Authentication with Access & Refresh Tokens',
      'Multi-Factor Authentication (MFA)',
      'OAuth 2.0 (Google, Facebook)',
      'Role-Based Access Control (RBAC)',
      'Device Management',
      'Rate Limiting & Security',
      'Email Notifications',
      'Password Security'
    ]
  });
});

/**
 * Authentication Routes
 */
app.use('/api/auth', authRoutes);

/**
 * @route   GET /api/docs
 * @desc    API Documentation
 * @access  Public
 */
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Documentation - NodeJS Lab 8',
    baseURL: `${req.protocol}://${req.get('host')}/api`,
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <access_token>',
      refreshToken: 'Use /api/auth/refresh endpoint'
    },
    endpoints: {
      public: {
        'POST /auth/register': 'สมัครสมาชิก',
        'POST /auth/login': 'เข้าสู่ระบบ',
        'POST /auth/refresh': 'ต่ออายุ Access Token',
        'POST /auth/forgot-password': 'ขอรีเซ็ตรหัสผ่าน',
        'POST /auth/reset-password': 'รีเซ็ตรหัสผ่าน',
        'GET /auth/verify-email/:token': 'ยืนยันอีเมล',
        'GET /auth/google': 'เข้าสู่ระบบด้วย Google',
        'GET /auth/facebook': 'เข้าสู่ระบบด้วย Facebook'
      },
      private: {
        'GET /auth/profile': 'ดูข้อมูลโปรไฟล์',
        'POST /auth/logout': 'ออกจากระบบ',
        'POST /auth/change-password': 'เปลี่ยนรหัสผ่าน',
        'GET /auth/devices': 'ดูอุปกรณ์ที่เข้าสู่ระบบ',
        'POST /auth/mfa/enable': 'เปิดใช้งาน MFA',
        'POST /auth/mfa/verify-setup': 'ยืนยันการตั้งค่า MFA'
      }
    },
    examples: {
      register: {
        method: 'POST',
        url: '/api/auth/register',
        body: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'ชื่อ',
          lastName: 'นามสกุล'
        }
      },
      login: {
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'Password123!'
        }
      }
    }
  });
});

/**
 * @route   GET /api/health
 * @desc    Health Check
 * @access  Public
 */
app.get('/api/health', async (req, res) => {
  try {
    const dbStats = await database.getStats();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.status(200).json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      database: dbStats,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      error: error.message
    });
  }
});

// ===========================================
// Error Handling Middleware
// ===========================================

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบเส้นทาง API ที่ระบุ',
    requestedPath: req.originalUrl,
    method: req.method,
    suggestions: [
      'ตรวจสอบ URL และ HTTP method',
      'ดู API documentation ที่ /api/docs',
      'ตรวจสอบว่าใส่ /api prefix หรือยัง'
    ]
  });
});

/**
 * Global Error Handler
 */
app.use((error, req, res, next) => {
  // Log error details
  console.error('🚨 Global Error Handler:');
  console.error('Request ID:', req.requestId);
  console.error('Path:', req.originalUrl);
  console.error('Method:', req.method);
  console.error('Error:', error);
  
  // CORS Error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      code: 'CORS_ERROR'
    });
  }
  
  // JWT Error
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token หมดอายุ',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // Validation Error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      code: 'VALIDATION_ERROR',
      errors
    });
  }
  
  // MongoDB Duplicate Key Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} ถูกใช้งานแล้ว`,
      code: 'DUPLICATE_ERROR'
    });
  }
  
  // Cast Error (Invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID ไม่ถูกต้อง',
      code: 'INVALID_ID'
    });
  }
  
  // Rate Limit Error
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'มีการเข้าถึงมากเกินไป กรุณาลองใหม่ในภายหลัง',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Default Error Response
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';
  
  res.status(statusCode).json({
    success: false,
    message,
    code: error.code || 'INTERNAL_ERROR',
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
});

// ===========================================
// Server Initialization
// ===========================================

/**
 * Start Server
 */
async function startServer() {
  try {
    console.log('🚀 กำลังเริ่มต้น NodeJS Lab 8 - Advanced Authentication...\n');
    
    // เชื่อมต่อฐานข้อมูล
    await database.connect();
    
    // เริ่มเซิร์ฟเวอร์
    const server = app.listen(PORT, () => {
      console.log('\n🎉 เซิร์ฟเวอร์พร้อมใช้งาน!');
      console.log('📍 URL:', `http://localhost:${PORT}`);
      console.log('🔐 API:', `http://localhost:${PORT}/api/auth`);
      console.log('📚 Docs:', `http://localhost:${PORT}/api/docs`);
      console.log('🏥 Health:', `http://localhost:${PORT}/api/health`);
      console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
      console.log('⏰ Started at:', new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
      console.log('\n📋 Available Features:');
      console.log('  ✅ JWT Authentication (Access & Refresh Tokens)');
      console.log('  ✅ Multi-Factor Authentication (MFA)');
      console.log('  ✅ OAuth 2.0 (Google, Facebook)');
      console.log('  ✅ Role-Based Access Control');
      console.log('  ✅ Device Management');
      console.log('  ✅ Rate Limiting & Security');
      console.log('  ✅ Email Notifications');
      console.log('  ✅ Password Security');
      console.log('\n🔧 Environment Variables:');
      console.log(`  📧 Email Service: ${process.env.EMAIL_HOST ? '✅' : '❌'}`);
      console.log(`  🔑 JWT Secrets: ${process.env.JWT_ACCESS_SECRET ? '✅' : '❌'}`);
      console.log(`  🌐 OAuth Google: ${process.env.GOOGLE_CLIENT_ID ? '✅' : '❌'}`);
      console.log(`  📘 OAuth Facebook: ${process.env.FACEBOOK_APP_ID ? '✅' : '❌'}`);
      console.log('\n📖 Next Steps:');
      console.log('  1. Copy .env.example to .env and configure');
      console.log('  2. Run: npm run seed (to create sample data)');
      console.log('  3. Test APIs with Postman or curl');
      console.log('  4. Check /api/docs for complete API reference');
      console.log('\n' + '='.repeat(50));
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      server.close(async () => {
        await database.disconnect();
        console.log('👋 Server closed');
        process.exit(0);
      });
    });
    
    return server;
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start server only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;