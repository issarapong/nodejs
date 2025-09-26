/**
 * Seed Database - Advanced Authentication Lab
 * สคริปต์สำหรับเพิ่มข้อมูลตัวอย่างลงฐานข้อมูล
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

// Services
const database = require('../config/database');

/**
 * ข้อมูลผู้ใช้ตัวอย่าง
 */
const sampleUsers = [
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    firstName: 'ผู้ดูแล',
    lastName: 'ระบบ',
    roles: ['user', 'admin'],
    permissions: [
      'read:users', 'write:users', 'delete:users',
      'read:products', 'write:products', 'delete:products',
      'read:orders', 'write:orders', 'delete:orders',
      'read:reports', 'write:reports',
      'manage:system', 'manage:users', 'manage:roles'
    ],
    status: 'active',
    isEmailVerified: true
  },
  {
    username: 'moderator',
    email: 'moderator@example.com',
    password: 'ModeratorPass123!',
    firstName: 'ผู้ดูแล',
    lastName: 'เนื้อหา',
    roles: ['user', 'moderator'],
    permissions: [
      'read:users', 'read:products', 'write:products',
      'read:orders', 'write:orders',
      'read:reports'
    ],
    status: 'active',
    isEmailVerified: true
  },
  {
    username: 'user1',
    email: 'user1@example.com',
    password: 'UserPassword123!',
    firstName: 'ผู้ใช้',
    lastName: 'ทั่วไป 1',
    roles: ['user'],
    permissions: ['read:products', 'read:orders'],
    status: 'active',
    isEmailVerified: true,
    phone: '0812345678'
  },
  {
    username: 'user2',
    email: 'user2@example.com',
    password: 'UserPassword123!',
    firstName: 'ผู้ใช้',
    lastName: 'ทั่วไป 2',
    roles: ['user'],
    permissions: ['read:products', 'read:orders'],
    status: 'active',
    isEmailVerified: true,
    mfaEnabled: true, // MFA enabled user
    phone: '0823456789'
  },
  {
    username: 'inactive_user',
    email: 'inactive@example.com',
    password: 'InactivePass123!',
    firstName: 'ผู้ใช้',
    lastName: 'ไม่ใช้งาน',
    roles: ['user'],
    status: 'inactive',
    isEmailVerified: false
  },
  {
    username: 'pending_user',
    email: 'pending@example.com',
    password: 'PendingPass123!',
    firstName: 'ผู้ใช้',
    lastName: 'รอยืนยัน',
    roles: ['user'],
    status: 'pending',
    isEmailVerified: false
  }
];

/**
 * เพิ่มผู้ใช้ตัวอย่าง
 */
async function seedUsers() {
  try {
    console.log('🔄 กำลังสร้างผู้ใช้ตัวอย่าง...');
    
    // ลบข้อมูลเก่า
    await User.deleteMany({});
    console.log('🗑️ ลบข้อมูลผู้ใช้เก่า');
    
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      try {
        const user = new User(userData);
        
        // สำหรับ MFA user ให้ตั้งค่า MFA secret
        if (userData.mfaEnabled) {
          const secret = user.generateMFASecret();
          user.mfaSecret = secret.base32;
          user.generateMFABackupCodes();
        }
        
        // เพิ่มประวัติการเข้าสู่ระบบปลอม
        user.lastLogin = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        user.lastLoginIP = `192.168.1.${Math.floor(Math.random() * 100) + 1}`;
        user.lastLoginUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        
        await user.save();
        createdUsers.push(user);
        
        console.log(`   • ${user.username} (${user.roles.join(', ')}) - ${user.email}`);
        
      } catch (error) {
        console.error(`❌ เกิดข้อผิดพลาดในการสร้างผู้ใช้ ${userData.username}:`, error.message);
      }
    }
    
    console.log(`✅ สร้างผู้ใช้ ${createdUsers.length} คน`);
    return createdUsers;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างผู้ใช้:', error);
    throw error;
  }
}

/**
 * เพิ่ม Refresh Tokens ตัวอย่าง
 */
async function seedRefreshTokens(users) {
  try {
    console.log('🔄 กำลังสร้าง Refresh Tokens ตัวอย่าง...');
    
    // ลบข้อมูลเก่า
    await RefreshToken.deleteMany({});
    console.log('🗑️ ลบ Refresh Tokens เก่า');
    
    const tokens = [];
    
    // สร้าง tokens สำหรับผู้ใช้ที่ active
    const activeUsers = users.filter(user => user.status === 'active');
    
    for (const user of activeUsers) {
      // สร้าง 1-3 tokens ต่อผู้ใช้ (จำลองการเข้าสู่ระบบหลายอุปกรณ์)
      const tokenCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < tokenCount; i++) {
        const deviceTypes = ['desktop', 'mobile', 'tablet'];
        const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        
        const deviceInfo = {
          deviceId: require('crypto').randomBytes(8).toString('hex'),
          name: `${user.firstName}'s ${deviceType}`,
          type: deviceType,
          os: deviceType === 'mobile' ? 'iOS' : deviceType === 'tablet' ? 'Android' : 'Windows',
          browser: 'Chrome',
          userAgent: 'Mozilla/5.0 (compatible; SeedDevice)',
          ipAddress: `192.168.1.${Math.floor(Math.random() * 100) + 1}`,
          location: {
            country: 'Thailand',
            region: 'Bangkok',
            city: 'Bangkok',
            timezone: 'Asia/Bangkok'
          }
        };
        
        const token = await RefreshToken.createToken(user._id, deviceInfo);
        tokens.push(token);
      }
    }
    
    console.log(`✅ สร้าง Refresh Tokens ${tokens.length} tokens`);
    return tokens;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้าง Refresh Tokens:', error);
    throw error;
  }
}

/**
 * แสดงข้อมูลสำคัญ
 */
function displayImportantInfo(users) {
  console.log('\n' + '='.repeat(50));
  console.log('📋 ข้อมูลสำคัญสำหรับการทดสอบ');
  console.log('='.repeat(50));
  
  console.log('\n🔐 บัญชีทดสอบ:');
  users.forEach(user => {
    console.log(`\n👤 ${user.username}`);
    console.log(`   📧 อีเมล: ${user.email}`);
    console.log(`   🔑 รหัสผ่าน: [ดูใน sampleUsers array]`);
    console.log(`   📱 สถานะ: ${user.status}`);
    console.log(`   ✅ ยืนยันอีเมล: ${user.isEmailVerified ? 'แล้ว' : 'ยังไม่'}`);
    console.log(`   🛡️ บทบาท: ${user.roles.join(', ')}`);
    console.log(`   🔐 MFA: ${user.mfaEnabled ? 'เปิด' : 'ปิด'}`);
    
    if (user.mfaEnabled && user.mfaBackupCodes?.length > 0) {
      console.log(`   🎫 Backup Codes: ${user.mfaBackupCodes.slice(0, 3).map(c => c.code).join(', ')}...`);
    }
  });
  
  console.log('\n📖 วิธีการทดสอบ:');
  console.log('1. เข้าสู่ระบบ:');
  console.log('   curl -X POST "http://localhost:3001/api/auth/login" \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"email": "admin@example.com", "password": "AdminPassword123!"}\' | jq .');
  
  console.log('\n2. ดูข้อมูลโปรไฟล์:');
  console.log('   curl -X GET "http://localhost:3001/api/auth/profile" \\');
  console.log('     -H "Authorization: Bearer <access_token>" | jq .');
  
  console.log('\n3. ดูอุปกรณ์:');
  console.log('   curl -X GET "http://localhost:3001/api/auth/devices" \\');
  console.log('     -H "Authorization: Bearer <access_token>" | jq .');
  
  console.log('\n4. เปิดใช้งาน MFA:');
  console.log('   curl -X POST "http://localhost:3001/api/auth/mfa/enable" \\');
  console.log('     -H "Authorization: Bearer <access_token>" | jq .');
  
  console.log('\n5. API Documentation:');
  console.log('   curl "http://localhost:3001/api/docs" | jq .');
  
  console.log('\n' + '='.repeat(50));
}

/**
 * ฟังก์ชั่นหลัก
 */
async function seedDatabase() {
  try {
    console.log('🌱 ======================================');
    console.log('🌱 เริ่มเพิ่มข้อมูลตัวอย่างลงฐานข้อมูล');
    console.log('🌱 ======================================');
    
    // เชื่อมต่อฐานข้อมูล
    await database.connect();
    
    // เพิ่มข้อมูลตัวอย่าง
    const users = await seedUsers();
    const tokens = await seedRefreshTokens(users);
    
    // แสดงข้อมูลสำคัญ
    displayImportantInfo(users);
    
    console.log('\n🎉 เพิ่มข้อมูลตัวอย่างสำเร็จ!');
    console.log(`📊 สรุป: ${users.length} users, ${tokens.length} refresh tokens`);
    
  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาดในการเพิ่มข้อมูล:', error);
  } finally {
    // ตัดการเชื่อมต่อ
    console.log('\n🔄 กำลังตัดการเชื่อมต่อกับ MongoDB...');
    await database.disconnect();
    console.log('✅ ตัดการเชื่อมต่อกับ MongoDB สำเร็จ');
  }
}

// เรียกใช้ฟังก์ชั่นหากไฟล์นี้ถูกรันโดยตรง
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase, sampleUsers };