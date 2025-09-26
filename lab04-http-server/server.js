// server.js - HTTP Server หลักสำหรับ Lab 4

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

console.log('=== Lab 4: HTTP Server พื้นฐาน ===\n');

// ข้อมูลผู้ใช้ตัวอย่าง
const users = [
    { id: 1, name: 'สมชาย ใจดี', email: 'somchai@example.com', age: 28, city: 'กรุงเทพฯ' },
    { id: 2, name: 'สมหญิง ใจงาม', email: 'somying@example.com', age: 25, city: 'เชียงใหม่' },
    { id: 3, name: 'วิทย์ เก่งกล้า', email: 'wit@example.com', age: 30, city: 'ภูเก็ต' }
];

// ข้อมูลสถิติเซิร์ฟเวอร์
const serverStats = {
    startTime: new Date(),
    requestCount: 0,
    visitors: new Set()
};

// ฟังก์ชันหา MIME type
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.txt': 'text/plain',
        '.pdf': 'application/pdf'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

// ฟังก์ชันเสิร์ฟไฟล์ static
function serveStaticFile(res, filePath, mimeType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>404 - ไม่พบไฟล์</title></head>
                <body style="font-family: Arial; text-align: center; margin: 50px;">
                    <h1>404 - ไม่พบไฟล์</h1>
                    <p>ไฟล์ที่คุณต้องการไม่มีในระบบ</p>
                    <a href="/">← กลับหน้าหลัก</a>
                </body>
                </html>
            `);
            return;
        }
        
        res.writeHead(200, { 
            'Content-Type': mimeType + '; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'Last-Modified': fs.statSync(filePath).mtime.toUTCString()
        });
        res.end(data);
    });
}

// ฟังก์ชันส่ง JSON response
function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data, null, 2));
}

// ฟังก์ชันส่ง HTML response
function sendHTML(res, html, statusCode = 200) {
    res.writeHead(statusCode, {
        'Content-Type': 'text/html; charset=utf-8'
    });
    res.end(html);
}

// สร้าง HTTP Server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;
    
    // เพิ่มจำนวนการเรียกใช้
    serverStats.requestCount++;
    
    // เก็บ IP ของผู้เยี่ยมชม
    const clientIP = req.connection.remoteAddress || req.headers['x-forwarded-for'];
    if (clientIP) {
        serverStats.visitors.add(clientIP);
    }
    
    console.log(`${new Date().toISOString()} - ${method} ${pathname}`);
    
    // Routing
    if (pathname === '/' && method === 'GET') {
        // หน้าหลัก
        serveStaticFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html');
        
    } else if (pathname === '/about' && method === 'GET') {
        // หน้า About
        const aboutHTML = `
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8">
                <title>เกี่ยวกับ - Node.js Lab</title>
                <style>
                    body { font-family: Arial; margin: 40px; line-height: 1.6; }
                    .container { max-width: 800px; margin: 0 auto; }
                    h1 { color: #4CAF50; }
                    .info { background: #f9f9f9; padding: 20px; border-radius: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📋 เกี่ยวกับ Lab นี้</h1>
                    <div class="info">
                        <h3>🎯 วัตถุประสงค์</h3>
                        <p>Lab นี้สร้างขึ้นเพื่อสอนการใช้งาน HTTP Server ใน Node.js</p>
                        
                        <h3>🛠️ เทคโนโลยี</h3>
                        <ul>
                            <li>Node.js HTTP Module</li>
                            <li>File System (fs)</li>
                            <li>URL Parsing</li>
                            <li>JSON API</li>
                        </ul>
                        
                        <h3>📊 สถิติ</h3>
                        <p>เซิร์ฟเวอร์เริ่มทำงาน: ${serverStats.startTime.toLocaleString('th-TH')}</p>
                        <p>จำนวนการเรียกใช้: ${serverStats.requestCount}</p>
                        <p>ผู้เยี่ยมชม: ${serverStats.visitors.size} คน</p>
                    </div>
                    <br>
                    <a href="/">← กลับหน้าหลัก</a>
                </div>
            </body>
            </html>
        `;
        sendHTML(res, aboutHTML);
        
    } else if (pathname === '/api/users' && method === 'GET') {
        // API ดึงข้อมูลผู้ใช้
        sendJSON(res, {
            success: true,
            data: users,
            total: users.length,
            timestamp: new Date().toISOString()
        });
        
    } else if (pathname === '/api/users' && method === 'POST') {
        // API เพิ่มผู้ใช้ใหม่
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const newUser = JSON.parse(body);
                newUser.id = users.length + 1;
                users.push(newUser);
                
                sendJSON(res, {
                    success: true,
                    message: 'เพิ่มผู้ใช้ใหม่สำเร็จ',
                    data: newUser
                }, 201);
            } catch (error) {
                sendJSON(res, {
                    success: false,
                    message: 'ข้อมูล JSON ไม่ถูกต้อง',
                    error: error.message
                }, 400);
            }
        });
        
    } else if (pathname.startsWith('/api/users/') && method === 'GET') {
        // API ดึงข้อมูลผู้ใช้ตาม ID
        const userId = parseInt(pathname.split('/')[3]);
        const user = users.find(u => u.id === userId);
        
        if (user) {
            sendJSON(res, {
                success: true,
                data: user
            });
        } else {
            sendJSON(res, {
                success: false,
                message: 'ไม่พบผู้ใช้'
            }, 404);
        }
        
    } else if (pathname === '/api/time' && method === 'GET') {
        // API เวลาปัจจุบัน
        const now = new Date();
        sendJSON(res, {
            success: true,
            data: {
                iso: now.toISOString(),
                thai: now.toLocaleString('th-TH'),
                timestamp: now.getTime(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        });
        
    } else if (pathname === '/api/status' && method === 'GET') {
        // API สถานะเซิร์ฟเวอร์
        const uptime = Date.now() - serverStats.startTime.getTime();
        sendJSON(res, {
            success: true,
            data: {
                status: 'online',
                uptime: Math.floor(uptime / 1000) + ' วินาที',
                requestCount: serverStats.requestCount,
                visitors: serverStats.visitors.size,
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform
            }
        });
        
    } else if (pathname.startsWith('/static/')) {
        // เสิร์ฟไฟล์ static
        const fileName = pathname.replace('/static/', '');
        const filePath = path.join(__dirname, 'public', fileName);
        const mimeType = getMimeType(filePath);
        
        serveStaticFile(res, filePath, mimeType);
        
    } else if (pathname === '/favicon.ico') {
        // ไอคอนของเว็บไซต์
        res.writeHead(204);
        res.end();
        
    } else {
        // 404 Not Found
        const notFoundHTML = `
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8">
                <title>404 - ไม่พบหน้า</title>
                <style>
                    body { 
                        font-family: Arial; 
                        text-align: center; 
                        margin: 50px;
                        background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
                        color: white;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .error-container {
                        background: rgba(255,255,255,0.95);
                        color: #333;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                    h1 { color: #FF6B6B; font-size: 4em; margin: 0; }
                    p { font-size: 1.2em; margin: 20px 0; }
                    a { 
                        display: inline-block;
                        padding: 12px 30px;
                        background: #4ECDC4;
                        color: white;
                        text-decoration: none;
                        border-radius: 25px;
                        transition: background 0.3s ease;
                    }
                    a:hover { background: #45B7B8; }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>404</h1>
                    <p>😅 ขออีกที ไม่พบหน้าที่คุณต้องการ</p>
                    <p>URL: <code>${pathname}</code></p>
                    <a href="/">🏠 กลับหน้าหลัก</a>
                </div>
            </body>
            </html>
        `;
        sendHTML(res, notFoundHTML, 404);
    }
});

// เริ่มต้นเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 เซิร์ฟเวอร์กำลังทำงานที่ http://localhost:${PORT}`);
    console.log('📋 ลิงก์ทดสอบ:');
    console.log(`   - หน้าหลัก: http://localhost:${PORT}/`);
    console.log(`   - เกี่ยวกับ: http://localhost:${PORT}/about`);
    console.log(`   - API ผู้ใช้: http://localhost:${PORT}/api/users`);
    console.log(`   - API เวลา: http://localhost:${PORT}/api/time`);
    console.log(`   - API สถานะ: http://localhost:${PORT}/api/status`);
    console.log(`   - Static files: http://localhost:${PORT}/static/demo.html`);
    console.log('\n💡 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์\n');
});

// จัดการการปิดเซิร์ฟเวอร์อย่างสวยงาม
process.on('SIGTERM', () => {
    console.log('\n🛑 กำลังปิดเซิร์ฟเวอร์...');
    server.close(() => {
        console.log('✅ เซิร์ฟเวอร์ปิดเรียบร้อยแล้ว');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 ได้รับสัญญาณหยุด (Ctrl+C)');
    server.close(() => {
        const uptime = Date.now() - serverStats.startTime.getTime();
        console.log('📊 สถิติการทำงาน:');
        console.log(`   - เวลาทำงาน: ${Math.floor(uptime / 1000)} วินาที`);
        console.log(`   - จำนวนการเรียกใช้: ${serverStats.requestCount}`);
        console.log(`   - ผู้เยี่ยมชม: ${serverStats.visitors.size} คน`);
        console.log('✅ เซิร์ฟเวอร์ปิดเรียบร้อยแล้ว');
        process.exit(0);
    });
});