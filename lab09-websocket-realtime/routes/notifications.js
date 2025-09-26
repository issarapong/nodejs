/**
 * Notification Routes
 * API endpoints สำหรับระบบการแจ้งเตือน
 */

const express = require('express');
const { body, query } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

/**
 * Get user notifications
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('isRead').optional().isBoolean(),
  query('type').optional().isIn([
    'message', 'mention', 'room_invite', 'room_join', 'room_leave',
    'friend_request', 'friend_accept', 'system', 'announcement',
    'reminder', 'alert', 'update', 'security', 'maintenance'
  ]),
  query('category').optional().isIn([
    'chat', 'system', 'security', 'social', 'update', 'marketing', 'reminder'
  ]),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
], notificationController.getUserNotifications);

/**
 * Create notification
 */
router.post('/', [
  body('recipient')
    .notEmpty()
    .withMessage('Recipient is required')
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  body('type')
    .isIn([
      'message', 'mention', 'room_invite', 'room_join', 'room_leave',
      'friend_request', 'friend_accept', 'system', 'announcement',
      'reminder', 'alert', 'update', 'security', 'maintenance'
    ])
    .withMessage('Invalid notification type'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be 1-100 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be 1-500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('category')
    .optional()
    .isIn(['chat', 'system', 'security', 'social', 'update', 'marketing', 'reminder'])
    .withMessage('Invalid category'),
  body('channels').optional().isObject(),
  body('action').optional().isObject(),
  body('relatedTo').optional().isObject(),
  body('expiresAt').optional().isISO8601()
], notificationController.createNotification);

/**
 * Mark notification as read
 */
router.put('/:notificationId/read', notificationController.markAsRead);

/**
 * Mark all notifications as read
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * Delete notification
 */
router.delete('/:notificationId', notificationController.deleteNotification);

/**
 * Get unread count
 */
router.get('/count/unread', notificationController.getUnreadCount);

/**
 * Create bulk notifications (admin only)
 */
router.post('/bulk', requireAdmin, [
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('Recipients must be a non-empty array'),
  body('recipients.*')
    .isMongoId()
    .withMessage('Each recipient must be a valid user ID'),
  body('type')
    .isIn([
      'message', 'mention', 'room_invite', 'room_join', 'room_leave',
      'friend_request', 'friend_accept', 'system', 'announcement',
      'reminder', 'alert', 'update', 'security', 'maintenance'
    ])
    .withMessage('Invalid notification type'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be 1-100 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be 1-500 characters')
], notificationController.createBulkNotifications);

/**
 * Get notification statistics
 */
router.get('/stats', [
  query('days').optional().isInt({ min: 1, max: 365 })
], notificationController.getNotificationStats);

/**
 * Update notification settings
 */
router.put('/settings', [
  body('settings').isObject().withMessage('Settings must be an object')
], notificationController.updateNotificationSettings);

/**
 * Get notification settings
 */
router.get('/settings', notificationController.getNotificationSettings);

module.exports = router;