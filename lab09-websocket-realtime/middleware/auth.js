/**
 * Authentication Middleware
 * ตรวจสอบ JWT token สำหรับ HTTP requests
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // ตรวจสอบ JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // หาผู้ใช้ในฐานข้อมูล
    const user = await User.findById(decoded.id)
      .select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User account is not active'
      });
    }

    // อัพเดท last activity
    user.lastActivity = new Date();
    await user.save();

    // เก็บข้อมูลผู้ใช้ใน request object
    req.user = user;
    req.userId = user._id.toString();

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Convert single role to array
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user has any of the required roles
    const hasRole = requiredRoles.some(role => req.user.roles.includes(role));
    
    if (requiredRoles.length > 0 && !hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Admin authorization middleware
 */
const requireAdmin = authorize(['admin']);

/**
 * Moderator authorization middleware (includes admin)
 */
const requireModerator = authorize(['moderator', 'admin']);

module.exports = {
  auth,
  authorize,
  requireAdmin,
  requireModerator
};