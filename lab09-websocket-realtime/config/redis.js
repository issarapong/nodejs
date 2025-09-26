/**
 * Redis Configuration
 * Redis connection และ pub/sub configuration
 */

const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('🔄 กำลังเชื่อมต่อกับ Redis...');
      
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      console.log(`📍 Redis URL: ${redisUrl}`);

      // สร้าง Redis clients
      this.client = redis.createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB) || 0,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      this.subscriber = this.client.duplicate();
      this.publisher = this.client.duplicate();

      // Event listeners
      this.setupEventListeners();

      // เชื่อมต่อ
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      this.isConnected = true;
      console.log('🟢 Redis connected successfully');
      console.log('✅ เชื่อมต่อกับ Redis สำเร็จ!');

      return { client: this.client, subscriber: this.subscriber, publisher: this.publisher };

    } catch (error) {
      this.isConnected = false;
      console.error('💥 Redis connection error:', error.message);
      throw error;
    }
  }

  setupEventListeners() {
    // Main client events
    this.client.on('connect', () => {
      console.log('🟢 Redis client connected');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    this.client.on('error', (error) => {
      console.error('🔴 Redis client error:', error.message);
    });

    this.client.on('end', () => {
      console.log('🟡 Redis client connection ended');
    });

    // Subscriber events
    this.subscriber.on('connect', () => {
      console.log('🟢 Redis subscriber connected');
    });

    this.subscriber.on('error', (error) => {
      console.error('🔴 Redis subscriber error:', error.message);
    });

    // Publisher events
    this.publisher.on('connect', () => {
      console.log('🟢 Redis publisher connected');
    });

    this.publisher.on('error', (error) => {
      console.error('🔴 Redis publisher error:', error.message);
    });
  }

  async disconnect() {
    try {
      if (this.client || this.subscriber || this.publisher) {
        console.log('🔄 กำลังตัดการเชื่อมต่อกับ Redis...');
        
        await Promise.all([
          this.client?.quit(),
          this.subscriber?.quit(),
          this.publisher?.quit()
        ]);

        this.isConnected = false;
        console.log('✅ ตัดการเชื่อมต่อกับ Redis สำเร็จ');
      }
    } catch (error) {
      console.error('💥 Error disconnecting from Redis:', error.message);
      throw error;
    }
  }

  // Session Store Methods
  async setSession(sessionId, data, ttl = 3600) {
    if (!this.isReady()) return null;
    
    try {
      await this.client.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Redis setSession error:', error);
      return false;
    }
  }

  async getSession(sessionId) {
    if (!this.isReady()) return null;
    
    try {
      const data = await this.client.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getSession error:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    if (!this.isReady()) return false;
    
    try {
      await this.client.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      console.error('Redis deleteSession error:', error);
      return false;
    }
  }

  // Cache Methods
  async set(key, value, ttl) {
    if (!this.isReady()) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.isReady()) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    if (!this.isReady()) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  // Pub/Sub Methods
  async publish(channel, message) {
    if (!this.isReady()) return false;
    
    try {
      const serializedMessage = JSON.stringify(message);
      await this.publisher.publish(channel, serializedMessage);
      return true;
    } catch (error) {
      console.error('Redis publish error:', error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    if (!this.isReady()) return false;
    
    try {
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error('Redis message parse error:', error);
          callback(message); // Send raw message if parse fails
        }
      });
      return true;
    } catch (error) {
      console.error('Redis subscribe error:', error);
      return false;
    }
  }

  async unsubscribe(channel) {
    if (!this.isReady()) return false;
    
    try {
      await this.subscriber.unsubscribe(channel);
      return true;
    } catch (error) {
      console.error('Redis unsubscribe error:', error);
      return false;
    }
  }

  // User Online Status Methods
  async setUserOnline(userId, socketId) {
    if (!this.isReady()) return false;
    
    try {
      // เพิ่ม socket ID ลงใน set
      await this.client.sAdd(`user:${userId}:sockets`, socketId);
      // Set user online status
      await this.client.set(`user:${userId}:online`, '1', { EX: 3600 });
      return true;
    } catch (error) {
      console.error('Redis setUserOnline error:', error);
      return false;
    }
  }

  async setUserOffline(userId, socketId) {
    if (!this.isReady()) return false;
    
    try {
      // ลบ socket ID จาก set
      await this.client.sRem(`user:${userId}:sockets`, socketId);
      
      // ตรวจสอบว่ามี socket อื่นหรือไม่
      const socketCount = await this.client.sCard(`user:${userId}:sockets`);
      
      if (socketCount === 0) {
        // ไม่มี socket เหลือ = offline
        await this.client.del(`user:${userId}:online`);
        await this.client.set(`user:${userId}:lastseen`, Date.now());
      }
      
      return true;
    } catch (error) {
      console.error('Redis setUserOffline error:', error);
      return false;
    }
  }

  async isUserOnline(userId) {
    if (!this.isReady()) return false;
    
    try {
      const online = await this.client.get(`user:${userId}:online`);
      return online === '1';
    } catch (error) {
      console.error('Redis isUserOnline error:', error);
      return false;
    }
  }

  async getUserSockets(userId) {
    if (!this.isReady()) return [];
    
    try {
      return await this.client.sMembers(`user:${userId}:sockets`);
    } catch (error) {
      console.error('Redis getUserSockets error:', error);
      return [];
    }
  }

  // Rate Limiting Methods
  async checkRateLimit(key, limit, window) {
    if (!this.isReady()) return { allowed: true, remaining: limit };
    
    try {
      const current = await this.client.incr(key);
      
      if (current === 1) {
        // First request, set expiration
        await this.client.expire(key, window);
      }
      
      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);
      
      return { allowed, remaining, current };
    } catch (error) {
      console.error('Redis checkRateLimit error:', error);
      return { allowed: true, remaining: limit };
    }
  }

  // Utility Methods
  isReady() {
    return this.isConnected && this.client?.isReady;
  }

  getClient() {
    return this.client;
  }

  getSubscriber() {
    return this.subscriber;
  }

  getPublisher() {
    return this.publisher;
  }
}

// Singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;