/**
 * Lab 7: Database Integration - Express Application
 * แอปพลิเคชันหลักสำหรับการจัดการฐานข้อมูล
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Database connection
const { database } = require('./config/database');

// Routes
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== เชื่อมต่อฐานข้อมูล ====================

/**
 * เชื่อมต่อกับ MongoDB
 */
async function connectDatabase() {
  try {
    await database.connect();
    
    // สร้าง indexes ที่จำเป็น
    await database.createIndexes();
    
    console.log('🎯 ระบบฐานข้อมูลพร้อมใช้งาน');
  } catch (error) {
    console.error('💥 เชื่อมต่อฐานข้อมูลไม่สำเร็จ:', error.message);
    process.exit(1);
  }
}

// ==================== Middleware Configuration ====================

/**
 * Security Middleware
 */
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // อนุญาตให้เรียกจากทุก origin สำหรับ development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5500' // Live Server
    ];

    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('ไม่อนุญาตให้เรียก API จาก origin นี้'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

/**
 * Rate Limiting
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // จำกัด requests
  message: {
    success: false,
    message: 'เรียก API บ่อยเกินไป กรุณารอสักครู่',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

/**
 * HTTP Request Logging
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * Body Parsing & Compression
 */
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request Logging สำหรับ debugging
 */
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  
  // เก็บ timestamp เริ่มต้น
  req.startTime = Date.now();
  
  // Intercept response เพื่อ log response time
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - req.startTime;
    console.log(`⚡ Response Time: ${responseTime}ms - Status: ${res.statusCode}`);
    return originalSend.call(this, data);
  };
  
  next();
});

// ==================== Routes ====================

/**
 * Health Check Endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const dbStatus = database.getConnectionStatus();
    const dbStats = await database.getStats();
    
    res.json({
      success: true,
      message: 'เซิร์ฟเวอร์ทำงานปกติ',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        database: dbStatus,
        stats: dbStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ระบบมีปัญหา',
      error: error.message
    });
  }
});

/**
 * API Documentation
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ยินดีต้อนรับสู่ Node.js Database Integration API',
    data: {
      version: '1.0.0',
      description: 'RESTful API สำหรับการจัดการข้อมูลสินค้า ผู้ใช้ และคำสั่งซื้อ',
      endpoints: {
        users: '/api/users',
        products: '/api/products',
        orders: '/api/orders',
        health: '/health',
        docs: '/api-docs'
      },
      features: [
        'User Authentication & Authorization',
        'Product Management & Search',
        'Order Processing & Tracking',
        'Database Relationships & Transactions',
        'Input Validation & Error Handling',
        'Rate Limiting & Security'
      ]
    }
  });
});

/**
 * API Documentation Page
 */
app.get('/api-docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    data: {
      title: 'Node.js Lab 7: Database Integration API',
      version: '1.0.0',
      baseURL: `http://localhost:${PORT}/api`,
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <token>',
        howToGet: 'POST /api/users/login หรือ POST /api/users/register'
      },
      endpoints: {
        auth: {
          register: 'POST /api/users/register',
          login: 'POST /api/users/login',
          profile: 'GET /api/users/profile (requires auth)',
          updateProfile: 'PUT /api/users/profile (requires auth)',
          changePassword: 'PUT /api/users/change-password (requires auth)'
        },
        products: {
          getAll: 'GET /api/products',
          getById: 'GET /api/products/:id',
          search: 'GET /api/products/search?q=keyword',
          featured: 'GET /api/products/featured',
          bestsellers: 'GET /api/products/bestsellers',
          byCategory: 'GET /api/products/category/:category',
          create: 'POST /api/products (requires admin)',
          update: 'PUT /api/products/:id (requires admin)',
          delete: 'DELETE /api/products/:id (requires admin)',
          addReview: 'POST /api/products/:id/reviews (requires auth)'
        },
        orders: {
          create: 'POST /api/orders (requires auth)',
          getMyOrders: 'GET /api/orders/my-orders (requires auth)',
          getById: 'GET /api/orders/:id (requires auth)',
          cancel: 'PUT /api/orders/:id/cancel (requires auth)',
          getAll: 'GET /api/orders (requires admin)',
          updateStatus: 'PUT /api/orders/:id/status (requires admin)',
          stats: 'GET /api/orders/admin/stats (requires admin)'
        }
      },
      examples: {
        register: {
          method: 'POST',
          url: '/api/users/register',
          body: {
            username: 'john_doe',
            email: 'john@example.com',
            password: 'Password123',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '0812345678'
          }
        },
        login: {
          method: 'POST',
          url: '/api/users/login',
          body: {
            email: 'john@example.com',
            password: 'Password123'
          }
        },
        createProduct: {
          method: 'POST',
          url: '/api/products',
          headers: {
            'Authorization': 'Bearer <token>',
            'Content-Type': 'application/json'
          },
          body: {
            name: 'iPhone 15 Pro',
            description: 'มือถือรุ่นล่าสุดจาก Apple',
            price: 39900,
            category: 'electronics',
            stock: 10,
            brand: 'Apple',
            images: [
              { url: 'https://example.com/iphone.jpg', alt: 'iPhone 15 Pro' }
            ]
          }
        },
        createOrder: {
          method: 'POST',
          url: '/api/orders',
          headers: {
            'Authorization': 'Bearer <token>',
            'Content-Type': 'application/json'
          },
          body: {
            items: [
              {
                product: '507f1f77bcf86cd799439011',
                quantity: 2
              }
            ],
            shippingAddress: {
              firstName: 'John',
              lastName: 'Doe',
              street: '123 หมู่ 1',
              city: 'กรุงเทพฯ',
              postalCode: '10100',
              country: 'Thailand',
              phoneNumber: '0812345678'
            },
            payment: {
              method: 'credit_card'
            }
          }
        }
      }
    }
  });
});

/**
 * API Routes
 */
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// ==================== Error Handling ====================

/**
 * 404 Error Handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบ endpoint ที่ต้องการ',
    error: 'ENDPOINT_NOT_FOUND',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api-docs',
      'POST /api/users/register',
      'POST /api/users/login',
      'GET /api/products',
      'GET /api/orders/my-orders'
    ]
  });
});

/**
 * Global Error Handler
 */
app.use((error, req, res, next) => {
  console.error('💥 Global Error Handler:', error);

  // MongoDB Duplicate Key Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} นี้มีอยู่แล้วในระบบ`,
      error: 'DUPLICATE_KEY',
      field
    });
  }

  // Validation Error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      error: 'VALIDATION_ERROR',
      errors
    });
  }

  // Cast Error (Invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID ไม่ถูกต้อง',
      error: 'INVALID_ID',
      field: error.path,
      value: error.value
    });
  }

  // JWT Error
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง',
      error: 'INVALID_TOKEN'
    });
  }

  // CORS Error
  if (error.message.includes('origin')) {
    return res.status(403).json({
      success: false,
      message: 'ไม่อนุญาตให้เรียก API จาก origin นี้',
      error: 'CORS_ERROR'
    });
  }

  // Default Error
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';

  res.status(statusCode).json({
    success: false,
    message,
    error: error.name || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
});

// ==================== Server Start ====================

/**
 * เริ่มต้นเซิร์ฟเวอร์
 */
async function startServer() {
  try {
    // เชื่อมต่อฐานข้อมูล
    await connectDatabase();
    
    // เริ่มเซิร์ฟเวอร์
    const server = app.listen(PORT, () => {
      console.log('🚀 ======================================');
      console.log('🎯 Node.js Database Integration Lab');
      console.log('🚀 ======================================');
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`💊 Health: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ======================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        database.disconnect();
      });
    });

    process.on('SIGINT', () => {
      console.log('🔄 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        database.disconnect();
      });
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// เริ่มต้นแอปพลิเคชัน
if (require.main === module) {
  startServer();
}

module.exports = app;