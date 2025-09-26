/**
 * Order Routes - เส้นทาง API สำหรับการจัดการคำสั่งซื้อ
 * /api/orders/*
 */

const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const { auth, adminAuth } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');

// ==================== Protected Routes (ต้อง Login) ====================

/**
 * ดูคำสั่งซื้อของผู้ใช้ปัจจุบัน
 * GET /api/orders/my-orders?page=1&limit=10&status=pending&sort=-createdAt
 */
router.get('/my-orders', auth, OrderController.getMyOrders);

/**
 * สร้างคำสั่งซื้อใหม่
 * POST /api/orders
 */
router.post('/', auth, validateOrder, OrderController.createOrder);

/**
 * ดูข้อมูลคำสั่งซื้อรายเดียว
 * GET /api/orders/:id
 * หมายเหตุ: ลูกค้าดูได้เฉพาะคำสั่งซื้อของตัวเอง, Admin ดูได้ทั้งหมด
 */
router.get('/:id', auth, OrderController.getOrderById);

/**
 * ยกเลิกคำสั่งซื้อ
 * PUT /api/orders/:id/cancel
 * Body: { reason?: 'เหตุผลในการยกเลิก' }
 */
router.put('/:id/cancel', auth, OrderController.cancelOrder);

// ==================== Admin Routes (ต้อง Login + Admin) ====================

/**
 * ดูรายการคำสั่งซื้อทั้งหมด (Admin เท่านั้น)
 * GET /api/orders?page=1&limit=10&status=pending&userId=user_id&search=keyword&startDate=2024-01-01&endDate=2024-12-31&sort=-createdAt
 */
router.get('/', auth, adminAuth, OrderController.getAllOrders);

/**
 * สถิติคำสั่งซื้อ (Admin เท่านั้น)
 * GET /api/orders/stats
 */
router.get('/admin/stats', auth, adminAuth, OrderController.getOrderStats);

/**
 * รายงานยอดขาย (Admin เท่านั้น)
 * GET /api/orders/reports/sales?startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/reports/sales', auth, adminAuth, OrderController.getSalesReport);

/**
 * อัปเดตสถานะคำสั่งซื้อ (Admin เท่านั้น)
 * PUT /api/orders/:id/status
 * Body: { status: 'pending|confirmed|processing|shipped|delivered|cancelled|refunded', note?: 'หมายเหตุ' }
 */
router.put('/:id/status', auth, adminAuth, OrderController.updateOrderStatus);

/**
 * อัปเดตข้อมูลการชำระเงิน (Admin เท่านั้น)
 * PUT /api/orders/:id/payment
 * Body: { method?: 'credit_card|bank_transfer|...', status?: 'pending|completed|failed|...', transactionId?: 'TXN123', ... }
 */
router.put('/:id/payment', auth, adminAuth, OrderController.updatePayment);

/**
 * อัปเดตข้อมูลการจัดส่ง (Admin เท่านั้น)  
 * PUT /api/orders/:id/shipping
 * Body: { trackingNumber?: 'TRACK123', provider?: 'Kerry Express', estimatedDelivery?: '2024-01-15' }
 */
router.put('/:id/shipping', auth, adminAuth, OrderController.updateShipping);

module.exports = router;