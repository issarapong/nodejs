// app.js - Express.js Application หลัก

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

console.log('=== Lab 5: Express.js Framework ===\n');

// สร้าง Express application
const app = express();
const PORT = process.env.PORT || 3000;

// ข้อมูลตัวอย่าง
let users = [
    { id: 1, name: 'สมชาย ใจดี', email: 'somchai@example.com', age: 28, city: 'กรุงเทพฯ' },
    { id: 2, name: 'สมหญิง ใจงาม', email: 'somying@example.com', age: 25, city: 'เชียงใหม่' },
    { id: 3, name: 'วิทย์ เก่งกล้า', email: 'wit@example.com', age: 30, city: 'ภูเก็ต' }
];

let posts = [
    { id: 1, title: 'การเรียน Node.js', content: 'Node.js เป็น JavaScript runtime...', author: 'สมชาย', createdAt: new Date() },
    { id: 2, title: 'Express.js Framework', content: 'Express.js ช่วยให้สร้าง web app ได้ง่าย...', author: 'สมหญิง', createdAt: new Date() }
];

// ============ MIDDLEWARE ============

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors());

// Logging middleware
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Custom logging middleware
app.use((req, res, next) => {
    console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // เพิ่ม timestamp ให้กับ request
    req.timestamp = new Date();
    
    next();
});

// Request counter middleware
let requestCount = 0;
app.use((req, res, next) => {
    requestCount++;
    req.requestId = requestCount;
    console.log(`📊 Request #${requestCount}`);
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
            <title>Express.js Lab</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 40px; 
                    line-height: 1.6;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                }
                .container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: rgba(255,255,255,0.95); 
                    color: #333; 
                    padding: 30px; 
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                h1 { color: #667eea; text-align: center; }
                .api-list { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                    gap: 20px; 
                    margin: 20px 0; 
                }
                .api-item { 
                    background: #f8f9fa; 
                    padding: 15px; 
                    border-radius: 8px; 
                    border-left: 4px solid #667eea; 
                }
                .api-item a { 
                    color: #667eea; 
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
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Express.js Lab</h1>
                
                <div class="status">
                    <strong>✅ สถานะ:</strong> เซิร์ฟเวอร์ทำงานปกติ<br>
                    <strong>🕒 เวลา:</strong> ${new Date().toLocaleString('th-TH')}<br>
                    <strong>📊 Request:</strong> #${req.requestId}
                </div>

                <h2>🔗 API Endpoints</h2>
                <div class="api-list">
                    <div class="api-item">
                        <a href="/api/users">GET /api/users</a>
                        <p>ดึงข้อมูลผู้ใช้ทั้งหมด</p>
                    </div>
                    <div class="api-item">
                        <a href="/api/users/1">GET /api/users/:id</a>
                        <p>ดึงข้อมูลผู้ใช้ตาม ID</p>
                    </div>
                    <div class="api-item">
                        <a href="/api/posts">GET /api/posts</a>
                        <p>ดึงข้อมูลโพสต์ทั้งหมด</p>
                    </div>
                    <div class="api-item">
                        <a href="/api/status">GET /api/status</a>
                        <p>สถานะเซิร์ฟเวอร์</p>
                    </div>
                    <div class="api-item">
                        <a href="/health">GET /health</a>
                        <p>Health check endpoint</p>
                    </div>
                </div>

                <h2>🧪 ทดสอบ POST Request</h2>
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">
# เพิ่มผู้ใช้ใหม่
curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{"name":"ผู้ใช้ใหม่","email":"new@example.com","age":25,"city":"ขอนแก่น"}'

# เพิ่มโพสต์ใหม่
curl -X POST http://localhost:3000/api/posts \\
  -H "Content-Type: application/json" \\
  -d '{"title":"หัวข้อใหม่","content":"เนื้อหาของโพสต์","author":"ผู้เขียน"}'</pre>
            </div>
        </body>
        </html>
    `);
});

// API Routes - Users
app.get('/api/users', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    
    let filteredUsers = users;
    
    // Filter by search term
    if (search) {
        filteredUsers = users.filter(user => 
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.city.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    res.json({
        success: true,
        data: paginatedUsers,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(filteredUsers.length / limit),
            totalItems: filteredUsers.length,
            itemsPerPage: limit
        },
        timestamp: req.timestamp,
        requestId: req.requestId
    });
});

app.get('/api/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'ไม่พบผู้ใช้',
            requestId: req.requestId
        });
    }
    
    res.json({
        success: true,
        data: user,
        requestId: req.requestId
    });
});

app.post('/api/users', (req, res) => {
    const { name, email, age, city } = req.body;
    
    // Validation
    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: 'กรุณากรอกชื่อและอีเมล',
            requestId: req.requestId
        });
    }
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
        return res.status(400).json({
            success: false,
            message: 'อีเมลนี้ถูกใช้งานแล้ว',
            requestId: req.requestId
        });
    }
    
    const newUser = {
        id: Math.max(...users.map(u => u.id)) + 1,
        name,
        email,
        age: age || null,
        city: city || null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    users.push(newUser);
    
    res.status(201).json({
        success: true,
        message: 'เพิ่มผู้ใช้ใหม่สำเร็จ',
        data: newUser,
        requestId: req.requestId
    });
});

app.put('/api/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'ไม่พบผู้ใช้',
            requestId: req.requestId
        });
    }
    
    const { name, email, age, city } = req.body;
    
    // Update user
    users[userIndex] = {
        ...users[userIndex],
        name: name || users[userIndex].name,
        email: email || users[userIndex].email,
        age: age !== undefined ? age : users[userIndex].age,
        city: city || users[userIndex].city,
        updatedAt: new Date()
    };
    
    res.json({
        success: true,
        message: 'อัพเดทข้อมูลผู้ใช้สำเร็จ',
        data: users[userIndex],
        requestId: req.requestId
    });
});

app.delete('/api/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'ไม่พบผู้ใช้',
            requestId: req.requestId
        });
    }
    
    const deletedUser = users.splice(userIndex, 1)[0];
    
    res.json({
        success: true,
        message: 'ลบผู้ใช้สำเร็จ',
        data: deletedUser,
        requestId: req.requestId
    });
});

// API Routes - Posts
app.get('/api/posts', (req, res) => {
    res.json({
        success: true,
        data: posts,
        total: posts.length,
        requestId: req.requestId
    });
});

app.post('/api/posts', (req, res) => {
    const { title, content, author } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({
            success: false,
            message: 'กรุณากรอกหัวข้อและเนื้อหา',
            requestId: req.requestId
        });
    }
    
    const newPost = {
        id: Math.max(...posts.map(p => p.id)) + 1,
        title,
        content,
        author: author || 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    posts.push(newPost);
    
    res.status(201).json({
        success: true,
        message: 'เพิ่มโพสต์ใหม่สำเร็จ',
        data: newPost,
        requestId: req.requestId
    });
});

// Status และ Health Check
app.get('/api/status', (req, res) => {
    const uptime = process.uptime();
    
    res.json({
        success: true,
        data: {
            status: 'online',
            uptime: `${Math.floor(uptime)} วินาที`,
            users: users.length,
            posts: posts.length,
            requestCount,
            memory: process.memoryUsage(),
            nodeVersion: process.version,
            timestamp: req.timestamp
        },
        requestId: req.requestId
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        requestId: req.requestId
    });
});

// ============ ERROR HANDLING ============

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'ไม่พบ endpoint ที่ต้องการ',
        path: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('❌ Error:', error);
    
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    });
});

// ============ SERVER STARTUP ============

app.listen(PORT, () => {
    console.log(`🚀 Express server กำลังทำงานที่ http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('📋 Available endpoints:');
    console.log(`   GET  /`);
    console.log(`   GET  /api/users`);
    console.log(`   GET  /api/users/:id`);
    console.log(`   POST /api/users`);
    console.log(`   PUT  /api/users/:id`);
    console.log(`   DELETE /api/users/:id`);
    console.log(`   GET  /api/posts`);
    console.log(`   POST /api/posts`);
    console.log(`   GET  /api/status`);
    console.log(`   GET  /health`);
    console.log('\n💡 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 กำลังปิดเซิร์ฟเวอร์...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 ได้รับสัญญาณหยุด (Ctrl+C)');
    console.log(`📊 สถิติ: ${requestCount} requests ทั้งหมด`);
    console.log('✅ เซิร์ฟเวอร์ปิดเรียบร้อยแล้ว');
    process.exit(0);
});