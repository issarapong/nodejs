/**
 * Winston Logger Configuration
 * จัดการการ logging สำหรับแอปพลิเคชัน
 */

const winston = require('winston');
const path = require('path');

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Custom colors for log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'grey',
  debug: 'white',
  silly: 'grey'
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += JSON.stringify(metadata);
    }
    
    return msg;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');
require('fs').mkdirSync(logDir, { recursive: true });

// Define transports
const transports = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
}

// File transports
transports.push(
  // Error log file
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'exceptions.log'),
    format: fileFormat,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'rejections.log'),
    format: fileFormat,
  })
);

// Add production console logging
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      ),
      level: 'info'
    })
  );
}

// HTTP request logging stream
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Socket.io specific logger
logger.socket = {
  connection: (socketId, userId, namespace) => {
    logger.info('Socket connected', {
      socketId,
      userId,
      namespace,
      timestamp: new Date().toISOString()
    });
  },
  
  disconnection: (socketId, userId, namespace, reason) => {
    logger.info('Socket disconnected', {
      socketId,
      userId,
      namespace,
      reason,
      timestamp: new Date().toISOString()
    });
  },
  
  event: (socketId, event, data, namespace) => {
    logger.debug('Socket event', {
      socketId,
      event,
      data,
      namespace,
      timestamp: new Date().toISOString()
    });
  },
  
  error: (socketId, error, namespace) => {
    logger.error('Socket error', {
      socketId,
      error: error.message,
      stack: error.stack,
      namespace,
      timestamp: new Date().toISOString()
    });
  }
};

// Database specific logger
logger.db = {
  connection: (dbType, status) => {
    logger.info(`Database ${status}`, {
      dbType,
      timestamp: new Date().toISOString()
    });
  },
  
  query: (collection, operation, duration) => {
    logger.debug('Database query', {
      collection,
      operation,
      duration,
      timestamp: new Date().toISOString()
    });
  },
  
  error: (operation, error) => {
    logger.error('Database error', {
      operation,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Security specific logger
logger.security = {
  auth: (userId, action, success, ip, userAgent) => {
    logger.info('Authentication event', {
      userId,
      action,
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  rateLimitExceeded: (ip, endpoint, limit) => {
    logger.warn('Rate limit exceeded', {
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString()
    });
  },
  
  suspiciousActivity: (ip, activity, details) => {
    logger.warn('Suspicious activity', {
      ip,
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance specific logger
logger.performance = {
  request: (method, url, duration, statusCode) => {
    logger.http('Request completed', {
      method,
      url,
      duration,
      statusCode,
      timestamp: new Date().toISOString()
    });
  },
  
  slowQuery: (query, duration) => {
    logger.warn('Slow query detected', {
      query,
      duration,
      timestamp: new Date().toISOString()
    });
  },
  
  memoryUsage: (usage) => {
    logger.debug('Memory usage', {
      ...usage,
      timestamp: new Date().toISOString()
    });
  }
};

// Business logic specific logger
logger.business = {
  userRegistration: (userId, email, method) => {
    logger.info('User registered', {
      userId,
      email,
      method,
      timestamp: new Date().toISOString()
    });
  },
  
  messageCreated: (messageId, senderId, roomId, type) => {
    logger.info('Message created', {
      messageId,
      senderId,
      roomId,
      type,
      timestamp: new Date().toISOString()
    });
  },
  
  roomCreated: (roomId, creatorId, type, memberCount) => {
    logger.info('Room created', {
      roomId,
      creatorId,
      type,
      memberCount,
      timestamp: new Date().toISOString()
    });
  },
  
  notificationSent: (notificationId, recipientId, type, method) => {
    logger.info('Notification sent', {
      notificationId,
      recipientId,
      type,
      method,
      timestamp: new Date().toISOString()
    });
  }
};

// Error handling and monitoring
logger.monitoring = {
  healthCheck: (service, status, responseTime) => {
    logger.info('Health check', {
      service,
      status,
      responseTime,
      timestamp: new Date().toISOString()
    });
  },
  
  metricUpdate: (metric, value, previousValue) => {
    logger.debug('Metric updated', {
      metric,
      value,
      previousValue,
      change: value - previousValue,
      timestamp: new Date().toISOString()
    });
  }
};

// Utility functions
logger.logWithContext = (level, message, context = {}) => {
  logger[level](message, {
    ...context,
    timestamp: new Date().toISOString()
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    ...context,
    timestamp: new Date().toISOString()
  });
};

logger.logPerformance = (operation, startTime, context = {}) => {
  const duration = Date.now() - startTime;
  logger.debug(`${operation} completed`, {
    operation,
    duration,
    ...context,
    timestamp: new Date().toISOString()
  });
};

// Export the logger
module.exports = logger;