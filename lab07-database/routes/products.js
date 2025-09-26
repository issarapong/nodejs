/**
 * Product Routes - เส้นทาง API สำหรับการจัดการสินค้า
 * /api/products/*
 */

const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const { auth, adminAuth } = require('../middleware/auth');
const { validateProduct, validateReview } = require('../middleware/validation');

// ==================== Public Routes ====================

/**
 * ดูรายการสินค้าทั้งหมด
 * GET /api/products?page=1&limit=12&search=keyword&category=electronics&brand=apple&minPrice=100&maxPrice=1000&sort=-createdAt&inStock=true
 */
router.get('/', ProductController.getAllProducts);

/**
 * ค้นหาสินค้า
 * GET /api/products/search?q=keyword&category=electronics&minPrice=100&maxPrice=1000
 */
router.get('/search', ProductController.searchProducts);

/**
 * สินค้าแนะนำ
 * GET /api/products/featured?limit=10
 */
router.get('/featured', ProductController.getFeaturedProducts);

/**
 * สินค้าขายดี
 * GET /api/products/bestsellers?limit=10
 */
router.get('/bestsellers', ProductController.getBestSellers);

/**
 * สินค้าใหม่
 * GET /api/products/latest?limit=10
 */
router.get('/latest', ProductController.getLatestProducts);

/**
 * ดูรายการหมวดหมู่ทั้งหมด
 * GET /api/products/categories
 */
router.get('/categories', ProductController.getCategories);

/**
 * ดูสินค้าตามหมวดหมู่
 * GET /api/products/category/:category?page=1&limit=12&sort=-createdAt
 */
router.get('/category/:category', ProductController.getProductsByCategory);

/**
 * ดูสินค้าด้วย slug
 * GET /api/products/slug/:slug
 */
router.get('/slug/:slug', ProductController.getProductBySlug);

/**
 * ดูข้อมูลสินค้ารายเดียว
 * GET /api/products/:id
 */
router.get('/:id', ProductController.getProductById);

// ==================== Protected Routes (ต้อง Login) ====================

/**
 * เพิ่มรีวิวสินค้า
 * POST /api/products/:id/reviews
 */
router.post('/:id/reviews', auth, validateReview, ProductController.addReview);

/**
 * ลบรีวิวสินค้า
 * DELETE /api/products/:id/reviews
 */
router.delete('/:id/reviews', auth, ProductController.removeReview);

// ==================== Admin Routes (ต้อง Login + Admin) ====================

/**
 * สร้างสินค้าใหม่
 * POST /api/products
 */
router.post('/', auth, adminAuth, validateProduct, ProductController.createProduct);

/**
 * แก้ไขข้อมูลสินค้า
 * PUT /api/products/:id
 */
router.put('/:id', auth, adminAuth, validateProduct, ProductController.updateProduct);

/**
 * ลบสินค้า (soft delete)
 * DELETE /api/products/:id
 */
router.delete('/:id', auth, adminAuth, ProductController.deleteProduct);

/**
 * อัปเดตสต็อกสินค้า
 * PUT /api/products/:id/stock
 * Body: { quantity: 100, operation: 'set|add|subtract', variantId?: 'variant_id' }
 */
router.put('/:id/stock', auth, adminAuth, ProductController.updateStock);

/**
 * สถิติสินค้า (Admin เท่านั้น)
 * GET /api/products/admin/stats
 */
router.get('/admin/stats', auth, adminAuth, ProductController.getProductStats);

module.exports = router;