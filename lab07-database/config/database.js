/**
 * การตั้งค่าฐานข้อมูล MongoDB
 * Database Configuration for MongoDB connection
 */

const mongoose = require('mongoose');
require('dotenv').config();

class Database {
  constructor() {
    this.mongodb_uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nodejs-lab';
    this.options = {
      // การตั้งค่าการเชื่อมต่อ
      maxPoolSize: 10, // จำนวน connection สูงสุดใน pool
      serverSelectionTimeoutMS: 5000, // Timeout สำหรับการเลือก server
      socketTimeoutMS: 45000, // Socket timeout
      bufferCommands: false // ปิด mongoose buffer commands
    };
  }

  /**
   * เชื่อมต่อกับ MongoDB
   */
  async connect() {
    try {
      console.log('🔄 กำลังเชื่อมต่อกับ MongoDB...');
      console.log(`📍 Database URI: ${this.mongodb_uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
      
      const connection = await mongoose.connect(this.mongodb_uri, this.options);
      
      console.log('✅ เชื่อมต่อกับ MongoDB สำเร็จ!');
      console.log(`📊 Database Name: ${connection.connection.name}`);
      console.log(`🌐 Host: ${connection.connection.host}:${connection.connection.port}`);
      
      // Event listeners สำหรับ monitoring
      this.setupEventListeners();
      
      return connection;
    } catch (error) {
      console.error('❌ ไม่สามารถเชื่อมต่อกับ MongoDB:', error.message);
      
      // แสดงวิธีแก้ไขปัญหา
      this.showTroubleshootingTips(error);
      
      // ออกจากแอป หากเชื่อมต่อไม่ได้
      process.exit(1);
    }
  }

  /**
   * ตั้งค่า Event Listeners สำหรับ monitoring
   */
  setupEventListeners() {
    const connection = mongoose.connection;

    // เมื่อเชื่อมต่อสำเร็จ
    connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    // เมื่อเกิดข้อผิดพลาด
    connection.on('error', (error) => {
      console.error('🔴 Mongoose connection error:', error);
    });

    // เมื่อการเชื่อมต่อขาดหาย
    connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from MongoDB');
    });

    // เมื่อ reconnect สำเร็จ
    connection.on('reconnected', () => {
      console.log('🟢 Mongoose reconnected to MongoDB');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * ตัดการเชื่อมต่อกับฐานข้อมูล
   */
  async disconnect() {
    try {
      console.log('🔄 กำลังตัดการเชื่อมต่อกับ MongoDB...');
      await mongoose.connection.close();
      console.log('✅ ตัดการเชื่อมต่อกับ MongoDB สำเร็จ');
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดขณะตัดการเชื่อมต่อ:', error.message);
    }
  }

  /**
   * ตรวจสอบสถานะการเชื่อมต่อ
   */
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    const state = mongoose.connection.readyState;
    return {
      state: states[state] || 'unknown',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * แสดงสถิติการเชื่อมต่อ
   */
  async getStats() {
    try {
      const admin = mongoose.connection.db.admin();
      const stats = await admin.serverStatus();
      
      return {
        mongodb_version: stats.version,
        uptime: stats.uptime,
        connections: stats.connections,
        memory: stats.mem,
        network: stats.network
      };
    } catch (error) {
      console.error('ไม่สามารถดึงสถิติฐานข้อมูล:', error.message);
      return null;
    }
  }

  /**
   * แสดงคำแนะนำการแก้ไขปัญหา
   */
  showTroubleshootingTips(error) {
    console.log('\n🔧 คำแนะนำการแก้ไขปัญหา:');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('• MongoDB Server ไม่ได้ทำงาน - ให้เริ่ม MongoDB Service');
      console.log('• ตรวจสอบ PORT ที่ตั้งค่าใน connection string');
      console.log('• หรือใช้ MongoDB Atlas (Cloud Database)');
    }
    
    if (error.message.includes('authentication failed')) {
      console.log('• ตรวจสอบ username และ password ใน connection string');
      console.log('• ตรวจสอบสิทธิการเข้าถึงฐานข้อมูล');
    }
    
    if (error.message.includes('network timeout')) {
      console.log('• ตรวจสอบการเชื่อมต่อ network');
      console.log('• เพิ่ม timeout ในการตั้งค่า');
    }
    
    console.log('• ตรวจสอบไฟล์ .env ว่ามี MONGODB_URI ถูกต้อง');
    console.log('• ลองใช้: docker run -d -p 27017:27017 mongo:latest\n');
  }

  /**
   * ล้างฐานข้อมูล (ใช้สำหรับ testing)
   */
  async clearDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ไม่สามารถล้างฐานข้อมูลใน production mode');
    }
    
    try {
      const collections = await mongoose.connection.db.collections();
      
      for (let collection of collections) {
        await collection.drop();
      }
      
      console.log('🗑️ ล้างฐานข้อมูลทั้งหมดแล้ว');
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการล้างฐานข้อมูล:', error.message);
    }
  }

  /**
   * สร้าง Indexes ที่จำเป็น
   */
  async createIndexes() {
    try {
      console.log('🔍 กำลังสร้าง Database Indexes...');
      
      // User indexes
      await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
      await mongoose.connection.collection('users').createIndex({ username: 1 }, { unique: true });
      
      // Product indexes
      await mongoose.connection.collection('products').createIndex({ name: 'text', description: 'text' });
      await mongoose.connection.collection('products').createIndex({ category: 1 });
      await mongoose.connection.collection('products').createIndex({ price: 1 });
      
      // Order indexes
      await mongoose.connection.collection('orders').createIndex({ userId: 1 });
      await mongoose.connection.collection('orders').createIndex({ createdAt: -1 });
      await mongoose.connection.collection('orders').createIndex({ status: 1 });
      
      console.log('✅ สร้าง Indexes สำเร็จ');
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสร้าง indexes:', error.message);
    }
  }
}

// สร้าง instance เดียว (Singleton pattern)
const database = new Database();

module.exports = {
  database,
  mongoose
};