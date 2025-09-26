// middleware/logger.js - Logging middleware

const fs = require('fs');
const path = require('path');

// สร้างโฟลเดอร์ logs ถ้าไม่มี
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Basic logging middleware
function basicLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`📝 [${timestamp}] ${method} ${url} - ${ip}`);
    next();
}

// Detailed logging middleware
function detailedLogger(req, res, next) {
    const start = Date.now();
    
    // เก็บข้อมูล request
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params
    };
    
    // Override res.end เพื่อ capture response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - start;
        
        logData.statusCode = res.statusCode;
        logData.duration = duration + 'ms';
        logData.responseTime = new Date().toISOString();
        
        // Log แบบสี
        const statusColor = getStatusColor(res.statusCode);
        console.log(
            `📊 ${logData.method} ${logData.url} ` +
            `${statusColor}${res.statusCode}\x1b[0m ` +
            `${duration}ms - ${logData.ip}`
        );
        
        // เขียนลง file
        const logLine = JSON.stringify(logData) + '\n';
        const logFile = path.join(logsDir, `access-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, logLine);
        
        // เรียก original end method
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
}

// Get color สำหรับ status code
function getStatusColor(statusCode) {
    if (statusCode >= 200 && statusCode < 300) return '\x1b[32m'; // Green
    if (statusCode >= 300 && statusCode < 400) return '\x1b[33m'; // Yellow
    if (statusCode >= 400 && statusCode < 500) return '\x1b[31m'; // Red
    if (statusCode >= 500) return '\x1b[35m'; // Magenta
    return '\x1b[0m'; // Reset
}

// Error logging middleware
function errorLogger(error, req, res, next) {
    const timestamp = new Date().toISOString();
    
    const errorData = {
        timestamp,
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        user: req.user ? { id: req.user.id, username: req.user.username } : null
    };
    
    console.error(`💥 [${timestamp}] ERROR in ${req.method} ${req.url}:`, error.message);
    
    // เขียน error log ลง file
    const errorLine = JSON.stringify(errorData) + '\n';
    const errorFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(errorFile, errorLine);
    
    next(error);
}

// Performance monitoring middleware
function performanceLogger(req, res, next) {
    const start = process.hrtime();
    
    req.on('end', () => {
        const diff = process.hrtime(start);
        const duration = diff[0] * 1000 + diff[1] * 1e-6; // Convert to milliseconds
        
        if (duration > 1000) { // Log slow requests (>1s)
            console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.url} took ${duration.toFixed(2)}ms`);
        }
    });
    
    next();
}

// Request counter middleware
let requestCount = 0;
const requestStats = {
    total: 0,
    byMethod: {},
    byPath: {},
    errors: 0,
    startTime: new Date()
};

function countRequests(req, res, next) {
    requestCount++;
    requestStats.total++;
    
    // Count by method
    requestStats.byMethod[req.method] = (requestStats.byMethod[req.method] || 0) + 1;
    
    // Count by path (simplified)
    const path = req.route ? req.route.path : req.url.split('?')[0];
    requestStats.byPath[path] = (requestStats.byPath[path] || 0) + 1;
    
    req.requestCount = requestCount;
    req.stats = requestStats;
    
    next();
}

// API rate limiting middleware
const rateLimitStorage = new Map();

function rateLimit(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    const max = options.max || 100; // limit each IP to 100 requests per windowMs
    const message = options.message || 'Too many requests';
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${ip}`;
        
        const now = Date.now();
        const record = rateLimitStorage.get(key) || { count: 0, resetTime: now + windowMs };
        
        // Reset if window expired
        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + windowMs;
        }
        
        record.count++;
        rateLimitStorage.set(key, record);
        
        // Set headers
        res.set({
            'X-RateLimit-Limit': max,
            'X-RateLimit-Remaining': Math.max(0, max - record.count),
            'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000)
        });
        
        if (record.count > max) {
            console.warn(`⚠️  Rate limit exceeded for ${ip}: ${record.count} requests`);
            return res.status(429).json({
                success: false,
                message: message,
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
        }
        
        next();
    };
}

module.exports = {
    basicLogger,
    detailedLogger,
    errorLogger,
    performanceLogger,
    countRequests,
    rateLimit,
    requestStats
};