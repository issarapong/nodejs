/**
 * Database Configuration - Advanced Auth Lab
 * การตั้งค่าฐานข้อมูล MongoDB สำหรับ Advanced Authentication
 */

const mongoose = require('mongoose');
require('dotenv').config();

class Database {
  constructor() {
    this.mongodb_uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nodejs-lab-auth';
    this.options = {
      // การตั้งค่าการเชื่อมต่อ
      maxPoolSize: 10, // จำนวน connection สูงสุดใน pool
      serverSelectionTimeoutMS: 5000, // Timeout สำหรับการเลือก server
      socketTimeoutMS: 45000, // Socket timeout
      bufferCommands: false // ปิด mongoose buffer commands
    };
    
    this.isConnected = false;
    this.setupEventHandlers();
  }

  /**
   * เชื่อมต่อกับ MongoDB
   */
  async connect() {
    try {
      console.log('🔄 กำลังเชื่อมต่อกับ MongoDB...');
      console.log(`📍 Database URI: ${this.mongodb_uri}`);
      
      await mongoose.connect(this.mongodb_uri, this.options);
      
      this.isConnected = true;
      console.log('✅ เชื่อมต่อกับ MongoDB สำเร็จ!');
      console.log(`📊 Database Name: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      
      // สร้าง indexes
      await this.createIndexes();
      
      return true;
      
    } catch (error) {
      this.isConnected = false;
      console.error('❌ ไม่สามารถเชื่อมต่อกับ MongoDB:', error.message);
      
      // แสดงคำแนะนำการแก้ไขปัญหา
      this.showTroubleshootingTips(error);
      
      throw error;
    }
  }

  /**
   * ตัดการเชื่อมต่อกับ MongoDB
   */
  async disconnect() {
    try {
      console.log('🔄 กำลังตัดการเชื่อมต่อกับ MongoDB...');
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ ตัดการเชื่อมต่อกับ MongoDB สำเร็จ');
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการตัดการเชื่อมต่อ:', error.message);
      throw error;
    }
  }

  /**
   * ตั้งค่า Event Handlers
   */
  setupEventHandlers() {
    // เมื่อเชื่อมต่อสำเร็จ
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    // เมื่อการเชื่อมต่อขาด
    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // เมื่อเกิดข้อผิดพลาด
    mongoose.connection.on('error', (error) => {
      console.error('🔴 Mongoose connection error:', error);
      this.isConnected = false;
    });

    // เมื่อแอพพลิเคชั่นปิด
    process.on('SIGINT', async () => {
      try {
        await this.disconnect();
        console.log('👋 แอพพลิเคชั่นปิดตัวลง การเชื่อมต่อฐานข้อมูลถูกปิดแล้ว');
        process.exit(0);
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการปิดการเชื่อมต่อ:', error);
        process.exit(1);
      }
    });
  }

  /**
   * สร้าง Database Indexes
   */
  async createIndexes() {
    try {
      console.log('🔄 กำลังสร้าง database indexes...');
      
      const User = require('../models/User');
      const RefreshToken = require('../models/RefreshToken');
      
      // User indexes
      await User.collection.createIndex({ email: 1 }, { unique: true });
      await User.collection.createIndex({ username: 1 }, { unique: true });
      await User.collection.createIndex({ roles: 1 });
      await User.collection.createIndex({ status: 1 });
      await User.collection.createIndex({ createdAt: -1 });
      await User.collection.createIndex({ lastLogin: -1 });
      await User.collection.createIndex({ 'trustedDevices.deviceId': 1 });
      
      // RefreshToken indexes
      await RefreshToken.collection.createIndex({ token: 1 }, { unique: true });
      await RefreshToken.collection.createIndex({ user: 1 });
      await RefreshToken.collection.createIndex({ deviceId: 1 });
      await RefreshToken.collection.createIndex({ family: 1 });
      await RefreshToken.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await RefreshToken.collection.createIndex({ isActive: 1, expiresAt: 1 });
      
      // Compound indexes
      await User.collection.createIndex({ email: 1, status: 1 });
      await RefreshToken.collection.createIndex({ user: 1, isActive: 1 });
      
      console.log('✅ สร้าง database indexes สำเร็จ');
      
    } catch (error) {
      if (error.code === 11000 || error.message.includes('already exists')) {
        console.log('ℹ️ Indexes มีอยู่แล้ว ข้าม...');
      } else {
        console.error('⚠️ เกิดข้อผิดพลาดในการสร้าง indexes:', error.message);
        // ไม่ throw error เพราะไม่ใช่ปัญหาร้อนแรง
      }
    }
  }

  /**
   * ตรวจสอบสถานะการเชื่อมต่อ
   */
  isReady() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * ดึงข้อมูลสถานะฐานข้อมูล
   */
  async getStats() {
    if (!this.isReady()) {
      return { connected: false };
    }

    try {
      const admin = mongoose.connection.db.admin();
      const serverStatus = await admin.serverStatus();
      
      return {
        connected: true,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
        version: serverStatus.version,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections,
        collections: Object.keys(mongoose.connection.collections).length
      };
    } catch (error) {
      console.error('ไม่สามารถดึงข้อมูลสถานะฐานข้อมูล:', error);
      return { 
        connected: true,
        error: error.message 
      };
    }
  }

  /**
   * ล้างข้อมูลฐานข้อมูล (ใช้สำหรับ testing)
   */
  async clearDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ไม่สามารถล้างข้อมูลใน production environment');
    }

    try {
      console.log('🧹 กำลังล้างข้อมูลฐานข้อมูล...');
      
      const collections = Object.keys(mongoose.connection.collections);
      
      for (const collection of collections) {
        await mongoose.connection.collections[collection].deleteMany({});
      }
      
      console.log('✅ ล้างข้อมูลฐานข้อมูลสำเร็จ');
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการล้างข้อมูล:', error);
      throw error;
    }
  }

  /**
   * Backup ฐานข้อมูล
   */
  async backup() {
    try {
      console.log('💾 กำลังสำรองข้อมูลฐานข้อมูล...');
      
      const User = require('../models/User');
      const RefreshToken = require('../models/RefreshToken');
      
      const backup = {
        timestamp: new Date().toISOString(),
        users: await User.find({}).lean(),
        refreshTokens: await RefreshToken.find({}).lean()
      };
      
      console.log(`✅ สำรองข้อมูลสำเร็จ: ${backup.users.length} users, ${backup.refreshTokens.length} tokens`);
      
      return backup;
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการสำรองข้อมูล:', error);
      throw error;
    }
  }

  /**
   * แสดงคำแนะนำการแก้ไขปัญหา
   */
  showTroubleshootingTips(error) {
    console.log('\n🔧 คำแนะนำการแก้ไขปัญหา:');
    
    if (error.name === 'MongoNetworkError') {
      console.log('• ตรวจสอบว่า MongoDB เปิดอยู่หรือไม่');
      console.log('• ตรวจสอบ connection string ใน MONGODB_URI');
      console.log('• ลองใช้: docker run -d -p 27017:27017 mongo:latest');
    }
    
    if (error.name === 'MongooseServerSelectionError') {
      console.log('• MongoDB server ไม่ตอบสนอง');
      console.log('• ตรวจสอบ firewall และ network settings');
    }
    
    if (error.name === 'MongoParseError') {
      console.log('• Connection string ไม่ถูกต้อง');
      console.log('• ตรวจสอบรูปแบบ MONGODB_URI');
    }
    
    console.log('• ตรวจสอบไฟล์ .env ว่ามี MONGODB_URI ถูกต้อง');
    console.log('• ลอง: npm run seed เพื่อสร้างข้อมูลทดสอบ\n');
  }
}

module.exports = new Database();