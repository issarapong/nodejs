// app.js - Lab 6: Middleware และ Advanced Routing

const express = require('express');
const path = require('path');

// Import custom middleware
const { basicLogger, detailedLogger, errorLogger, performanceLogger, countRequests, rateLimit, requestStats } = require('./middleware/logger');
const { loginMiddleware, authenticateMiddleware, authorizeMiddleware, logoutMiddleware } = require('./middleware/auth');
const { userValidation, loginValidation, createValidationSchema } = require('./middleware/validation');

console.log('=== Lab 6: Middleware และ Advanced Routing ===\n');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ GLOBAL MIDDLEWARE ============

// Built-in middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(countRequests);          // Count requests
app.use(basicLogger);            // Basic logging
app.use(performanceLogger);      // Performance monitoring

// Rate limiting (global)
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,                    // limit each IP to 100 requests per windowMs
    message: 'Too many API requests, please try again later'
}));

// Custom middleware examples
app.use((req, res, next) => {
    req.requestTime = new Date();
    req.customData = {
        userAgent: req.get('User-Agent'),
        acceptLanguage: req.get('Accept-Language'),
        host: req.get('Host')
    };
    next();
});

// ============ ROUTES ============

// หน้าหลัก
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lab 6: Middleware Demo</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 40px; 
                    line-height: 1.6;
                    background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
                    color: white;
                    min-height: 100vh;
                }
                .container { 
                    max-width: 900px; 
                    margin: 0 auto; 
                    background: rgba(255,255,255,0.95); 
                    color: #333; 
                    padding: 30px; 
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                h1 { color: #8B5CF6; text-align: center; }
                .middleware-demo { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                    gap: 20px; 
                    margin: 20px 0; 
                }
                .demo-card { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 10px; 
                    border-left: 4px solid #8B5CF6; 
                }
                .demo-card h3 { margin-top: 0; color: #8B5CF6; }
                .demo-card a { 
                    color: #06B6D4; 
                    text-decoration: none; 
                    font-weight: bold; 
                }
                .status { 
                    background: #d4edda; 
                    border: 1px solid #c3e6cb; 
                    padding: 15px; 
                    border-radius: 8px; 
                    margin: 20px 0; 
                }
                .curl-example {
                    background: #1a1a1a;
                    color: #00ff00;
                    padding: 15px;
                    border-radius: 5px;
                    font-family: monospace;
                    overflow-x: auto;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔧 Middleware & Routing Lab</h1>
                
                <div class="status">
                    <strong>📊 Request Stats:</strong><br>
                    Request #${req.requestCount} | Total: ${req.stats.total}<br>
                    <strong>🕒 Request Time:</strong> ${req.requestTime.toLocaleString('th-TH')}<br>
                    <strong>🌐 User Agent:</strong> ${req.customData.userAgent}
                </div>

                <h2>🔧 Middleware Demonstrations</h2>
                <div class="middleware-demo">
                    
                    <div class="demo-card">
                        <h3>🔐 Authentication</h3>
                        <p><a href="/api/auth/login">POST /api/auth/login</a></p>
                        <p>ทดสอบการ login และรับ token</p>
                        <div class="curl-example">
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'
                        </div>
                    </div>

                    <div class="demo-card">
                        <h3>👤 Protected Routes</h3>
                        <p><a href="/api/protected/profile">GET /api/protected/profile</a></p>
                        <p>เข้าถึงได้เฉพาะผู้ที่ login แล้ว</p>
                        <div class="curl-example">
curl -X GET http://localhost:3000/api/protected/profile \\
  -H "Authorization: Bearer YOUR_TOKEN"
                        </div>
                    </div>

                    <div class="demo-card">
                        <h3>🛡️ Admin Only</h3>
                        <p><a href="/api/admin/users">GET /api/admin/users</a></p>
                        <p>เข้าถึงได้เฉพาะ admin</p>
                        <div class="curl-example">
curl -X GET http://localhost:3000/api/admin/users \\
  -H "Authorization: Bearer ADMIN_TOKEN"
                        </div>
                    </div>

                    <div class="demo-card">
                        <h3>✅ Validation</h3>
                        <p><a href="/api/users/create">POST /api/users/create</a></p>
                        <p>ทดสอบ input validation</p>
                        <div class="curl-example">
curl -X POST http://localhost:3000/api/users/create \\
  -H "Content-Type: application/json" \\
  -d '{"name":"สมชาย","email":"somchai@example.com","age":25}'
                        </div>
                    </div>

                    <div class="demo-card">
                        <h3>⚡ Rate Limiting</h3>
                        <p><a href="/api/test/rate-limit">GET /api/test/rate-limit</a></p>
                        <p>ทดสอบ rate limiting (100 req/15min)</p>
                    </div>

                    <div class="demo-card">
                        <h3>📊 Request Stats</h3>
                        <p><a href="/api/stats">GET /api/stats</a></p>
                        <p>ดูสถิติการเรียกใช้ API</p>
                    </div>

                    <div class="demo-card">
                        <h3>💥 Error Demo</h3>
                        <p><a href="/api/test/error">GET /api/test/error</a></p>
                        <p>ทดสอบ error handling middleware</p>
                    </div>

                    <div class="demo-card">
                        <h3>🐌 Slow Route</h3>
                        <p><a href="/api/test/slow">GET /api/test/slow</a></p>
                        <p>ทดสอบ performance monitoring</p>
                    </div>

                </div>

                <h2>📚 Available Test Accounts</h2>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <strong>Admin:</strong> username: admin, password: admin123<br>
                    <strong>User:</strong> username: user, password: user123<br>
                    <strong>Guest:</strong> username: guest, password: guest123
                </div>
            </div>
        </body>
        </html>
    `);
});

// ============ AUTHENTICATION ROUTES ============

// Login route with validation
app.post('/api/auth/login', loginValidation, loginMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        data: {
            token: req.token,
            user: {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role
            }
        }
    });
});

// Logout route
app.post('/api/auth/logout', logoutMiddleware, (req, res) => {
    res.json({
        success: true,
        message: req.loggedOut ? 'ออกจากระบบสำเร็จ' : 'ไม่พบ session'
    });
});

// ============ PROTECTED ROUTES ============

// Protected routes (ต้อง login)
app.get('/api/protected/profile', authenticateMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'ข้อมูลโปรไฟล์',
        data: {
            user: req.user,
            session: req.session,
            requestTime: req.requestTime
        }
    });
});

app.get('/api/protected/dashboard', authenticateMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Dashboard data',
        data: {
            welcomeMessage: `สวัสดี ${req.user.username}!`,
            lastLogin: req.session.loginTime,
            userRole: req.user.role
        }
    });
});

// ============ ADMIN ONLY ROUTES ============

// Admin only routes
app.get('/api/admin/users', authenticateMiddleware, authorizeMiddleware(['admin']), (req, res) => {
    res.json({
        success: true,
        message: 'ข้อมูลผู้ใช้ทั้งหมด (Admin only)',
        data: [
            { id: 1, username: 'admin', role: 'admin' },
            { id: 2, username: 'user', role: 'user' },
            { id: 3, username: 'guest', role: 'guest' }
        ]
    });
});

app.get('/api/admin/logs', authenticateMiddleware, authorizeMiddleware(['admin']), detailedLogger, (req, res) => {
    res.json({
        success: true,
        message: 'System logs (Admin only)',
        data: {
            requestStats,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        }
    });
});

// ============ VALIDATION DEMO ROUTES ============

// User creation with validation
app.post('/api/users/create', userValidation, (req, res) => {
    res.json({
        success: true,
        message: 'ผู้ใช้ใหม่ถูกสร้างสำเร็จ',
        data: req.validatedData,
        note: 'ข้อมูลผ่านการ validate แล้ว'
    });
});

// Custom validation example
const customValidation = createValidationSchema({
    title: {
        required: true,
        type: 'string',
        minLength: 5,
        maxLength: 100
    },
    content: {
        required: true,
        type: 'string',
        minLength: 10
    },
    category: {
        required: true,
        type: 'string',
        custom: (value) => {
            const allowedCategories = ['tech', 'lifestyle', 'education', 'news'];
            if (!allowedCategories.includes(value)) {
                return `หมวดหมู่ต้องเป็น: ${allowedCategories.join(', ')}`;
            }
            return true;
        }
    }
});

app.post('/api/posts/create', customValidation, (req, res) => {
    res.json({
        success: true,
        message: 'โพสต์ถูกสร้างสำเร็จ',
        data: req.validatedData
    });
});

// ============ TEST ROUTES ============

// Rate limit test
app.get('/api/test/rate-limit', (req, res) => {
    res.json({
        success: true,
        message: 'Rate limit test',
        headers: {
            'X-RateLimit-Limit': res.get('X-RateLimit-Limit'),
            'X-RateLimit-Remaining': res.get('X-RateLimit-Remaining'),
            'X-RateLimit-Reset': res.get('X-RateLimit-Reset')
        }
    });
});

// Error test
app.get('/api/test/error', (req, res, next) => {
    const error = new Error('ข้อผิดพลาดทดสอบ');
    error.status = 500;
    next(error);
});

// Slow route test
app.get('/api/test/slow', (req, res) => {
    setTimeout(() => {
        res.json({
            success: true,
            message: 'Slow response (2 seconds delay)',
            timestamp: new Date().toISOString()
        });
    }, 2000);
});

// Stats route
app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            ...requestStats,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            currentRequests: req.requestCount
        }
    });
});

// ============ ERROR HANDLING MIDDLEWARE ============

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'ไม่พบ endpoint ที่ต้องการ',
        path: req.url,
        method: req.method
    });
});

// Error handling middleware
app.use(errorLogger);
app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        requestId: req.requestCount,
        timestamp: req.requestTime
    });
});

// ============ SERVER STARTUP ============

app.listen(PORT, () => {
    console.log(`🚀 Middleware Lab server กำลังทำงานที่ http://localhost:${PORT}`);
    console.log('📋 เปิดเบราว์เซอร์ไปที่ URL ข้างต้นเพื่อดู demo');
    console.log('📊 ทดสอบ middleware ต่าง ๆ ได้');
    console.log('\n💡 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 กำลังปิดเซิร์ฟเวอร์...');
    console.log(`📊 สถิติ: ${requestStats.total} requests ทั้งหมด`);
    console.log('✅ เซิร์ฟเวอร์ปิดเรียบร้อยแล้ว');
    process.exit(0);
});