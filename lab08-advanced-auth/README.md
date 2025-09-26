# 🔐 Lab 8: Advanced Authentication & Authorization
## 🎯 จุดประสงค์การเรียนรู้

ในแล็บนี้คุณจะได้เรียนรู้:
- 🔑 การจัดการ JWT tokens แบบขั้นสูง (Access & Refresh Tokens)
- 🔒 Multi-Factor Authentication (MFA) ด้วย Google Authenticator
- 🌐 OAuth 2.0 กับ Google และ Facebook
- 🛡️ Role-Based Access Control (RBAC) แบบละเอียด
- 📱 การจัดการ Sessions และ Device Management
- 🔐 Password Security และ Account Recovery
- 🚫 Rate Limiting และ Brute Force Protection

## 📚 เนื้อหาที่ต้องรู้ก่อน
- Lab 7: Database Integration
- ความรู้พื้นฐานเกี่ยวกับ JWT และ OAuth

## 🛠️ การติดตั้ง

```bash
cd lab08-advanced-auth
npm install
cp .env.example .env
```

## 🔧 Environment Variables

แก้ไขไฟล์ `.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/nodejs-lab-auth

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
ACCESS_TOKEN_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Email Service (สำหรับ OTP และ Password Reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# MFA
MFA_ISSUER=NodeJS-Lab
MFA_SERVICE_NAME=Advanced Auth Demo

# Rate Limiting
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=30
MAX_REQUESTS_PER_HOUR=1000

# Session
SESSION_SECRET=your-session-secret
```

## 🚀 การใช้งาน

```bash
# เพิ่มข้อมูลตัวอย่าง
node utils/seed.js

# เริ่มเซิร์ฟเวอร์
npm start

# Development mode
npm run dev
```

## 🔗 API Endpoints

### Authentication
```bash
# 1. สมัครสมาชิก
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "ชื่อ",
    "lastName": "นามสกุล"
  }'

# 2. เข้าสู่ระบบ
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# 3. Refresh Token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'

# 4. ออกจากระบบ
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer your-access-token"

# 5. ออกจากระบบทุกอุปกรณ์
curl -X POST http://localhost:3000/api/auth/logout-all \
  -H "Authorization: Bearer your-access-token"
```

### Multi-Factor Authentication (MFA)
```bash
# 1. เปิดใช้งาน MFA
curl -X POST http://localhost:3000/api/auth/mfa/enable \
  -H "Authorization: Bearer your-access-token"

# 2. ยืนยัน MFA setup
curl -X POST http://localhost:3000/api/auth/mfa/verify-setup \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456"
  }'

# 3. ปิดใช้งาน MFA
curl -X POST http://localhost:3000/api/auth/mfa/disable \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456"
  }'

# 4. ยืนยัน MFA เมื่อเข้าสู่ระบบ
curl -X POST http://localhost:3000/api/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "temp-token-from-login",
    "mfaToken": "123456"
  }'
```

### OAuth Authentication
```bash
# 1. เข้าสู่ระบบด้วย Google
curl http://localhost:3000/api/auth/google

# 2. เข้าสู่ระบบด้วย Facebook
curl http://localhost:3000/api/auth/facebook
```

### Password Management
```bash
# 1. เปลี่ยนรหัสผ่าน
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldPassword123!",
    "newPassword": "newPassword456!"
  }'

# 2. ขอรีเซ็ตรหัสผ่าน
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# 3. รีเซ็ตรหัสผ่าน
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "newPassword": "newPassword789!"
  }'
```

### Device & Session Management
```bash
# 1. ดูอุปกรณ์ที่เข้าสู่ระบบ
curl -X GET http://localhost:3000/api/auth/devices \
  -H "Authorization: Bearer your-access-token"

# 2. ออกจากระบบอุปกรณ์เฉพาะ
curl -X DELETE http://localhost:3000/api/auth/devices/device-id \
  -H "Authorization: Bearer your-access-token"

# 3. ดู Session ที่ใช้งาน
curl -X GET http://localhost:3000/api/auth/sessions \
  -H "Authorization: Bearer your-access-token"
```

### Admin Role Management
```bash
# 1. กำหนด Role ให้ผู้ใช้ (Admin only)
curl -X POST http://localhost:3000/api/admin/users/user-id/roles \
  -H "Authorization: Bearer admin-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": ["moderator", "editor"]
  }'

# 2. ดูรายชื่อผู้ใช้ทั้งหมด (Admin only)
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer admin-access-token"

# 3. ระงับบัญชีผู้ใช้ (Admin only)
curl -X POST http://localhost:3000/api/admin/users/user-id/suspend \
  -H "Authorization: Bearer admin-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "ละเมิดเงื่อนไขการใช้งาน"
  }'
```

## 🔐 Security Features

### 1. JWT Token Strategy
- **Access Token**: อายุสั้น (15 นาที) สำหรับ API calls
- **Refresh Token**: อายุยาว (7 วัน) สำหรับต่ออายุ Access Token
- **Token Rotation**: สร้าง Refresh Token ใหม่ทุกครั้งที่ refresh
- **Token Blacklist**: เก็บรายชื่อ token ที่ถูกยกเลิก

### 2. Multi-Factor Authentication (MFA)
- **TOTP (Time-based OTP)**: ใช้ Google Authenticator, Authy
- **Backup Codes**: รหัสสำรอง 10 ตัวสำหรับกรณีฉุกเฉิน
- **Recovery**: กู้คืนบัญชีเมื่อไม่มีอุปกรณ์ MFA

### 3. Brute Force Protection
- **Rate Limiting**: จำกัดจำนวนครั้งการลองเข้าสู่ระบบ
- **Account Locking**: ล็อคบัญชีชั่วคราวเมื่อมีการพยายามเข้าหาผิดหลายครั้ง
- **Progressive Delays**: เพิ่มเวลารอระหว่างการลองใหม่

### 4. Password Security
- **Strength Validation**: ตรวจสอบความแข็งแกร่งของรหัสผ่าน
- **History Check**: ไม่อนุญาตให้ใช้รหัสผ่านเก่า 5 รหัสล่าสุด
- **Secure Hashing**: bcrypt กับ salt rounds สูง

## 🎮 ตัวอย่างการใช้งาน

### สถานการณ์ที่ 1: ระบบ E-commerce
```javascript
// ลูกค้าทั่วไป - ดูสินค้า, สั่งซื้อ
const customer = { roles: ['customer'] };

// ผู้จัดการร้าน - จัดการสินค้า, ดูรายงานขาย
const shopManager = { roles: ['customer', 'shop_manager'] };

// แอดมิน - ทุกสิทธิ์
const admin = { roles: ['customer', 'shop_manager', 'admin'] };
```

### สถานการณ์ที่ 2: ระบบบริษัท
```javascript
// พนักงานทั่วไป
const employee = { roles: ['employee'] };

// หัวหน้างาน
const supervisor = { roles: ['employee', 'supervisor'] };

// HR
const hr = { roles: ['employee', 'hr'] };

// ผู้จัดการ
const manager = { roles: ['employee', 'supervisor', 'manager'] };
```

## 🧪 การทดสอบ

```bash
# รัน unit tests
npm test

# รัน integration tests
npm run test:integration

# ทดสอบ security
npm run test:security

# Test coverage
npm run test:coverage
```

## 📁 โครงสร้างโปรเจค

```
lab08-advanced-auth/
├── config/
│   ├── database.js
│   ├── passport.js
│   └── redis.js
├── controllers/
│   ├── authController.js
│   ├── mfaController.js
│   ├── oauthController.js
│   └── adminController.js
├── middleware/
│   ├── auth.js
│   ├── rbac.js
│   ├── rateLimit.js
│   └── validation.js
├── models/
│   ├── User.js
│   ├── RefreshToken.js
│   ├── LoginAttempt.js
│   └── Device.js
├── routes/
│   ├── auth.js
│   ├── admin.js
│   └── protected.js
├── services/
│   ├── tokenService.js
│   ├── emailService.js
│   ├── mfaService.js
│   └── deviceService.js
├── utils/
│   ├── helpers.js
│   ├── security.js
│   └── seed.js
├── tests/
│   ├── auth.test.js
│   ├── mfa.test.js
│   └── security.test.js
├── app.js
└── package.json
```

## 🔍 หัวข้อที่น่าสนใจ

1. **JWT vs Sessions**: เปรียบเทียบข้อดีข้อเสีย
2. **OAuth 2.0 Flow**: ทำความเข้าใจขั้นตอนการทำงาน
3. **RBAC vs ABAC**: ระบบจัดการสิทธิ์แบบต่างๆ
4. **Security Headers**: การป้องกันผ่าน HTTP headers
5. **CSRF Protection**: การป้องกันการโจมตี Cross-Site Request Forgery

## 🎯 เป้าหมายการเรียนรู้

เมื่อจบแล็บนี้ คุณจะสามารถ:
- ✅ สร้างระบบ Authentication ที่ปลอดภัยและครบถ้วน
- ✅ ใช้งาน MFA เพื่อเพิ่มความปลอดภัย
- ✅ ผสานระบบ OAuth กับ Social Login
- ✅ จัดการสิทธิ์ผู้ใช้แบบละเอียด
- ✅ ป้องกันการโจมตีแบบต่างๆ
- ✅ ออกแบบ Security Architecture สำหรับแอพพลิเคชั่นจริง

---
📝 **หมายเหตุ**: แล็บนี้เน้นความปลอดภัยเป็นหลัก ให้ศึกษาและทำความเข้าใจแต่ละส่วนก่อนนำไปใช้งานจริง