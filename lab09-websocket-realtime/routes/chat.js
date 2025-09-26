/**
 * Chat Routes
 * API endpoints สำหรับระบบแชท
 */

const express = require('express');
const { body, query } = require('express-validator');
const chatController = require('../controllers/chatController');
const { uploadChatFile, processMultipleFiles, handleUploadError } = require('../middleware/upload');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

/**
 * Get user's rooms
 */
router.get('/rooms', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['private', 'group', 'public', 'channel'])
], chatController.getUserRooms);

/**
 * Create new room
 */
router.post('/rooms', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('type')
    .optional()
    .isIn(['private', 'group', 'public', 'channel'])
    .withMessage('Invalid room type'),
  body('isPrivate')
    .optional()
    .isBoolean(),
  body('members')
    .optional()
    .isArray()
    .withMessage('Members must be an array')
], chatController.createRoom);

/**
 * Get room details
 */
router.get('/rooms/:roomId', chatController.getRoomDetails);

/**
 * Join room
 */
router.post('/rooms/:roomId/join', chatController.joinRoom);

/**
 * Leave room
 */
router.post('/rooms/:roomId/leave', chatController.leaveRoom);

/**
 * Get room messages
 */
router.get('/rooms/:roomId/messages', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('before').optional().isISO8601(),
  query('after').optional().isISO8601()
], chatController.getRoomMessages);

/**
 * Search messages in room
 */
router.get('/rooms/:roomId/messages/search', [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], chatController.searchMessages);

/**
 * Upload files
 */
router.post('/upload', 
  uploadChatFile,
  handleUploadError,
  processMultipleFiles,
  chatController.uploadFiles
);

/**
 * Get public rooms
 */
router.get('/public-rooms', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('search').optional().isLength({ max: 100 })
], chatController.getPublicRooms);

module.exports = router;