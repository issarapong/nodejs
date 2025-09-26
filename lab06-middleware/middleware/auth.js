// middleware/auth.js - Authentication middleware

// จำลองข้อมูลผู้ใช้
const users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
    { id: 2, username: 'user', password: 'user123', role: 'user' },
    { id: 3, username: 'guest', password: 'guest123', role: 'guest' }
];

// จำลอง session storage
const sessions = new Map();

// สร้าง session token
function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Middleware สำหรับ login
function loginMiddleware(req, res, next) {
    console.log('🔐 Login middleware ทำงาน');
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'กรุณากรอก username และ password'
        });
    }
    
    // หาผู้ใช้
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Username หรือ password ไม่ถูกต้อง'
        });
    }
    
    // สร้าง session
    const token = generateToken();
    sessions.set(token, {
        userId: user.id,
        username: user.username,
        role: user.role,
        loginTime: new Date()
    });
    
    // เก็บข้อมูลไว้ใน request
    req.user = user;
    req.token = token;
    
    next();
}

// Middleware สำหรับตรวจสอบการ login
function authenticateMiddleware(req, res, next) {
    console.log('🔍 Authentication middleware ทำงาน');
    
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'ไม่พบ token กรุณา login ก่อน'
        });
    }
    
    const session = sessions.get(token);
    
    if (!session) {
        return res.status(401).json({
            success: false,
            message: 'Token ไม่ถูกต้องหรือหมดอายุ'
        });
    }
    
    // ตรวจสอบการหมดอายุ (1 ชั่วโมง)
    const sessionAge = Date.now() - new Date(session.loginTime).getTime();
    if (sessionAge > 60 * 60 * 1000) { // 1 hour
        sessions.delete(token);
        return res.status(401).json({
            success: false,
            message: 'Session หมดอายุแล้ว'
        });
    }
    
    // หาข้อมูลผู้ใช้
    const user = users.find(u => u.id === session.userId);
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'ไม่พบข้อมูลผู้ใช้'
        });
    }
    
    req.user = user;
    req.session = session;
    req.token = token;
    
    next();
}

// Middleware สำหรับตรวจสอบสิทธิ์
function authorizeMiddleware(roles = []) {
    return (req, res, next) => {
        console.log(`👮 Authorization middleware ทำงาน (ต้องการ: ${roles.join(', ')})`);
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'กรุณา login ก่อน'
            });
        }
        
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์เข้าถึง',
                requiredRoles: roles,
                yourRole: req.user.role
            });
        }
        
        next();
    };
}

// Middleware สำหรับ logout
function logoutMiddleware(req, res, next) {
    console.log('🚪 Logout middleware ทำงาน');
    
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (token) {
        sessions.delete(token);
        req.loggedOut = true;
    }
    
    next();
}

module.exports = {
    loginMiddleware,
    authenticateMiddleware,
    authorizeMiddleware,
    logoutMiddleware,
    sessions // สำหรับ debugging
};