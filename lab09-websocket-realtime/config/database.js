/**
 * Database Configuration
 * MongoDB connection และ configuration
 */

const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('🔄 กำลังเชื่อมต่อกับ MongoDB...');
      
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nodejs-lab-realtime';
      console.log(`📍 Database URI: ${mongoURI}`);

      // MongoDB connection options
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false,
        family: 4,
      };

      this.connection = await mongoose.connect(mongoURI, options);
      this.isConnected = true;

      console.log('🟢 Mongoose connected to MongoDB');
      console.log('✅ เชื่อมต่อกับ MongoDB สำเร็จ!');
      console.log(`📊 Database Name: ${this.connection.connection.db.databaseName}`);
      console.log(`🌐 Host: ${this.connection.connection.host}:${this.connection.connection.port}`);

      // สร้าง indexes
      await this.createIndexes();
      
      return this.connection;

    } catch (error) {
      this.isConnected = false;
      console.error('💥 MongoDB connection error:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        console.log('🔄 กำลังตัดการเชื่อมต่อกับ MongoDB...');
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        console.log('🟡 Mongoose disconnected from MongoDB');
        console.log('✅ ตัดการเชื่อมต่อกับ MongoDB สำเร็จ');
      }
    } catch (error) {
      console.error('💥 Error disconnecting from MongoDB:', error.message);
      throw error;
    }
  }

  async createIndexes() {
    try {
      console.log('🔄 กำลังสร้าง database indexes...');

      const User = require('../models/User');
      const Room = require('../models/Room');
      const Message = require('../models/Message');
      const Notification = require('../models/Notification');

      // สร้าง indexes สำหรับ performance
      await Promise.all([
        // User indexes
        User.collection.createIndex({ username: 1 }, { unique: true }),
        User.collection.createIndex({ email: 1 }, { unique: true }),
        User.collection.createIndex({ isOnline: 1 }),
        User.collection.createIndex({ lastSeen: 1 }),
        
        // Room indexes
        Room.collection.createIndex({ name: 1 }),
        Room.collection.createIndex({ type: 1, status: 1 }),
        Room.collection.createIndex({ 'members.user': 1 }),
        
        // Message indexes
        Message.collection.createIndex({ room: 1, createdAt: -1 }),
        Message.collection.createIndex({ sender: 1, createdAt: -1 }),
        Message.collection.createIndex({ content: 'text' }),
        
        // Notification indexes
        Notification.collection.createIndex({ recipient: 1, createdAt: -1 }),
        Notification.collection.createIndex({ recipient: 1, isRead: 1 })
      ]);

      console.log('✅ สร้าง database indexes สำเร็จ');

    } catch (error) {
      console.error('💥 Error creating indexes:', error.message);
      // ไม่ throw error เพื่อไม่ให้ connection fail
    }
  }

  getConnection() {
    return this.connection;
  }

  isReady() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

// Event listeners
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  console.error('🔴 Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 กำลังตัดการเชื่อมต่อกับ MongoDB...');
  await mongoose.connection.close();
  console.log('✅ ตัดการเชื่อมต่อกับ MongoDB สำเร็จ');
  console.log('👋 แอพพลิเคชั่นปิดตัวลง การเชื่อมต่อฐานข้อมูลถูกปิดแล้ว');
  process.exit(0);
});

// Singleton instance
const database = new Database();

module.exports = database;