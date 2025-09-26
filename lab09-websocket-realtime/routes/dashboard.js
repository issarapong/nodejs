/**
 * Dashboard Routes
 * API endpoints สำหรับ real-time dashboard
 */

const express = require('express');
const { query } = require('express-validator');
const dashboardController = require('../controllers/dashboardController');
const { auth, requireModerator } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and moderator authorization to all routes
router.use(auth);
router.use(requireModerator);

/**
 * Get system metrics
 */
router.get('/metrics', dashboardController.getSystemMetrics);

/**
 * Get user metrics
 */
router.get('/users', [
  query('period').optional().isIn(['1d', '7d', '30d'])
], dashboardController.getUserMetrics);

/**
 * Get message metrics
 */
router.get('/messages', [
  query('period').optional().isIn(['1d', '7d', '30d']),
  query('roomId').optional().isMongoId()
], dashboardController.getMessageMetrics);

/**
 * Get room metrics
 */
router.get('/rooms', [
  query('period').optional().isIn(['1d', '7d', '30d'])
], dashboardController.getRoomMetrics);

/**
 * Get system performance
 */
router.get('/performance', dashboardController.getSystemPerformance);

/**
 * Get chart data
 */
router.get('/charts', [
  query('type')
    .isIn(['messages', 'users', 'online'])
    .withMessage('Invalid chart type'),
  query('period').optional().isIn(['1h', '24h', '7d'])
], dashboardController.getChartData);

module.exports = router;