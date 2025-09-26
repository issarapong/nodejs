/**
 * Validation Middleware - ตรวจสอบความถูกต้องของข้อมูลที่ส่งมา
 * ใช้ express-validator สำหรับการ validation
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Helper function สำหรับจัดการผลลัพธ์ validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      errors: formattedErrors
    });
  }
  
  next();
};

/**
 * Validation สำหรับการลงทะเบียนผู้ใช้
 */
const validateUser = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username ต้องมี 3-30 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username ใช้ได้เฉพาะตัวอักษร ตัวเลข และ underscore')
    .toLowerCase(),
  
  body('email')
    .isEmail()
    .withMessage('รูปแบบ Email ไม่ถูกต้อง')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password ต้องมีอย่างน้อย 6 ตัวอักษร')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password ต้องมีตัวอักษรพิมพ์เล็ก พิมพ์ใหญ่ และตัวเลข')
    .optional({ checkFalsy: true }), // ทำให้เป็น optional สำหรับการแก้ไข
  
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('ชื่อต้องมี 1-50 ตัวอักษร')
    .trim(),
  
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('นามสกุลต้องมี 1-50 ตัวอักษร')
    .trim(),
  
  body('phoneNumber')
    .optional()
    .matches(/^[0-9-+\s()]+$/)
    .withMessage('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง')
    .isLength({ max: 20 })
    .withMessage('เบอร์โทรศัพท์ต้องมีไม่เกิน 20 ตัวอักษร'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('รูปแบบวันเกิดไม่ถูกต้อง (ใช้ YYYY-MM-DD)')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate >= today) {
        throw new Error('วันเกิดไม่สามารถเป็นอนาคตได้');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validation สำหรับการเข้าสู่ระบบ
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('รูปแบบ Email ไม่ถูกต้อง')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password จำเป็นต้องกรอก'),
  
  handleValidationErrors
];

/**
 * Validation สำหรับการเปลี่ยนรหัสผ่าน
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('รหัสผ่านเดิมจำเป็นต้องกรอก'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('รหัสผ่านใหม่ต้องมีตัวอักษรพิมพ์เล็ก พิมพ์ใหญ่ และตัวเลข'),
  
  handleValidationErrors
];

/**
 * Validation สำหรับข้อมูลสินค้า
 */
const validateProduct = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('ชื่อสินค้าต้องมี 1-100 ตัวอักษร')
    .trim(),
  
  body('description')
    .isLength({ min: 1, max: 2000 })
    .withMessage('รายละเอียดสินค้าต้องมี 1-2000 ตัวอักษร')
    .trim(),
  
  body('shortDescription')
    .optional()
    .isLength({ max: 200 })
    .withMessage('รายละเอียดย่อต้องมีไม่เกิน 200 ตัวอักษร')
    .trim(),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('ราคาต้องเป็นตัวเลขและไม่ติดลบ'),
  
  body('originalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('ราคาเดิมต้องเป็นตัวเลขและไม่ติดลบ'),
  
  body('category')
    .isIn([
      'electronics', 'clothing', 'books', 'home-garden', 
      'sports', 'automotive', 'toys-games', 'health-beauty', 
      'food-beverages', 'other'
    ])
    .withMessage('หมวดหมู่สินค้าไม่ถูกต้อง'),
  
  body('stock')
    .isInt({ min: 0 })
    .withMessage('จำนวนสินค้าต้องเป็นจำนวนเต็มและไม่ติดลบ'),
  
  body('minStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('สินค้าขั้นต่ำต้องเป็นจำนวนเต็มและไม่ติดลบ'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('น้ำหนักต้องเป็นตัวเลขและไม่ติดลบ'),
  
  body('brand')
    .optional()
    .isLength({ max: 50 })
    .withMessage('แบรนด์ต้องมีไม่เกิน 50 ตัวอักษร')
    .trim(),
  
  body('sku')
    .optional()
    .isLength({ max: 50 })
    .withMessage('SKU ต้องมีไม่เกิน 50 ตัวอักษร')
    .trim()
    .toUpperCase(),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('รูปภาพต้องเป็น array'),
  
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('URL รูปภาพไม่ถูกต้อง'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags ต้องเป็น array'),
  
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 30 })
    .withMessage('แต่ละ tag ต้องมี 1-30 ตัวอักษร')
    .trim()
    .toLowerCase(),
  
  handleValidationErrors
];

/**
 * Validation สำหรับรีวิวสินค้า
 */
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('คะแนนรีวิวต้องเป็นตัวเลข 1-5'),
  
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('ความคิดเห็นต้องมีไม่เกิน 500 ตัวอักษร')
    .trim(),
  
  handleValidationErrors
];

/**
 * Validation สำหรับคำสั่งซื้อ
 */
const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('คำสั่งซื้อต้องมีสินค้าอย่างน้อย 1 รายการ'),
  
  body('items.*.product')
    .isMongoId()
    .withMessage('ID สินค้าไม่ถูกต้อง'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('จำนวนสินค้าต้องเป็นจำนวนเต็มมากกว่า 0'),
  
  body('shippingAddress.firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('ชื่อผู้รับต้องมี 1-50 ตัวอักษร')
    .trim(),
  
  body('shippingAddress.lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('นามสกุลผู้รับต้องมี 1-50 ตัวอักษร')
    .trim(),
  
  body('shippingAddress.street')
    .isLength({ min: 1, max: 200 })
    .withMessage('ที่อยู่ต้องมี 1-200 ตัวอักษร')
    .trim(),
  
  body('shippingAddress.city')
    .isLength({ min: 1, max: 100 })
    .withMessage('เมือง/อำเภอต้องมี 1-100 ตัวอักษร')
    .trim(),
  
  body('shippingAddress.postalCode')
    .matches(/^[0-9]{5}$/)
    .withMessage('รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'),
  
  body('shippingAddress.country')
    .isLength({ min: 1, max: 100 })
    .withMessage('ประเทศต้องมี 1-100 ตัวอักษร')
    .trim(),
  
  body('shippingAddress.phoneNumber')
    .optional()
    .matches(/^[0-9-+\s()]+$/)
    .withMessage('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'),
  
  body('payment.method')
    .optional()
    .isIn([
      'credit_card', 'debit_card', 'bank_transfer', 
      'mobile_banking', 'e_wallet', 'cash_on_delivery', 'installment'
    ])
    .withMessage('วิธีการชำระเงินไม่ถูกต้อง'),
  
  body('shipping.method')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'pickup'])
    .withMessage('วิธีการจัดส่งไม่ถูกต้อง'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('หมายเหตุต้องมีไม่เกิน 500 ตัวอักษร')
    .trim(),
  
  handleValidationErrors
];

/**
 * Validation สำหรับ Query Parameters ของสินค้า
 */
const validateProductQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('หมายเลขหน้าต้องเป็นจำนวนเต็มมากกว่า 0')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('จำนวนรายการต้องเป็นจำนวนเต็ม 1-100')
    .toInt(),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('ราคาขั้นต่ำต้องเป็นตัวเลขและไม่ติดลบ')
    .toFloat(),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('ราคาสูงสุดต้องเป็นตัวเลขและไม่ติดลบ')
    .toFloat(),
  
  query('category')
    .optional()
    .isIn([
      'electronics', 'clothing', 'books', 'home-garden', 
      'sports', 'automotive', 'toys-games', 'health-beauty', 
      'food-beverages', 'other'
    ])
    .withMessage('หมวดหมู่สินค้าไม่ถูกต้อง'),
  
  query('sort')
    .optional()
    .isIn([
      'name', '-name', 'price', '-price', 'createdAt', '-createdAt',
      'averageRating', '-averageRating', 'salesCount', '-salesCount'
    ])
    .withMessage('รูปแบบการเรียงไม่ถูกต้อง'),
  
  query('inStock')
    .optional()
    .isBoolean()
    .withMessage('inStock ต้องเป็น true หรือ false')
    .toBoolean(),
  
  handleValidationErrors
];

/**
 * Validation สำหรับ MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} ไม่ถูกต้อง`),
  
  handleValidationErrors
];

/**
 * Validation สำหรับ Date Range
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('รูปแบบวันที่เริ่มต้นไม่ถูกต้อง (ใช้ YYYY-MM-DD)'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('รูปแบบวันที่สิ้นสุดไม่ถูกต้อง (ใช้ YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        
        if (endDate < startDate) {
          throw new Error('วันที่สิ้นสุดต้องไม่เก่ากว่าวันที่เริ่มต้น');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Custom validation สำหรับตรวจสอบไฟล์อัปโหลด
 */
const validateFileUpload = (fieldName, options = {}) => [
  body(fieldName)
    .optional()
    .custom((value, { req }) => {
      const {
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
        maxSize = 5 * 1024 * 1024, // 5MB
        required = false
      } = options;
      
      if (required && !value) {
        throw new Error(`${fieldName} จำเป็นต้องแนบไฟล์`);
      }
      
      if (value && value.mimetype) {
        if (!allowedTypes.includes(value.mimetype)) {
          throw new Error(`ประเภทไฟล์ไม่ถูกต้อง อนุญาตเฉพาะ: ${allowedTypes.join(', ')}`);
        }
        
        if (value.size > maxSize) {
          throw new Error(`ขนาดไฟล์เกินกำหนด (สูงสุด ${Math.round(maxSize / 1024 / 1024)}MB)`);
        }
      }
      
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  validateUser,
  validateLogin,
  validatePasswordChange,
  validateProduct,
  validateReview,
  validateOrder,
  validateProductQuery,
  validateObjectId,
  validateDateRange,
  validateFileUpload,
  handleValidationErrors
};