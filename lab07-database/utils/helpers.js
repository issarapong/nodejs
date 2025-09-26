/**
 * Helper Functions - ฟังก์ชันช่วยเหลือทั่วไป
 */

const crypto = require('crypto');
const moment = require('moment');

/**
 * สร้าง Random String
 */
function generateRandomString(length = 10, type = 'alphanumeric') {
  const alphanumeric = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const numeric = '0123456789';
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  
  let characters;
  switch (type) {
    case 'numeric':
      characters = numeric;
      break;
    case 'alpha':
      characters = alpha;
      break;
    default:
      characters = alphanumeric;
  }
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * สร้าง SKU อัตโนมัติ
 */
function generateSKU(productName, category = '') {
  const cleanName = productName
    .replace(/[^a-zA-Z0-9\s]/g, '') // เอาตัวอักษรพิเศษออก
    .split(' ')
    .map(word => word.substring(0, 3).toUpperCase()) // เอา 3 ตัวแรกของแต่ละคำ
    .join('');
  
  const categoryCode = category.substring(0, 3).toUpperCase();
  const randomCode = generateRandomString(4, 'alphanumeric');
  
  return `${categoryCode}${cleanName}${randomCode}`;
}

/**
 * สร้างหมายเลขคำสั่งซื้อ
 */
function generateOrderNumber(prefix = 'ORD') {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  const randomNumber = generateRandomString(6, 'alphanumeric');
  
  return `${prefix}${year}${month}${day}${randomNumber}`;
}

/**
 * แปลงราคาเป็นรูปแบบที่อ่านได้
 */
function formatPrice(price, currency = 'THB') {
  const currencySymbols = {
    THB: '฿',
    USD: '$',
    EUR: '€'
  };
  
  const symbol = currencySymbols[currency] || currency;
  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
  
  return `${symbol}${formattedPrice}`;
}

/**
 * คำนวณส่วนลด
 */
function calculateDiscount(originalPrice, currentPrice) {
  if (originalPrice <= currentPrice) {
    return { discount: 0, percentage: 0 };
  }
  
  const discount = originalPrice - currentPrice;
  const percentage = Math.round((discount / originalPrice) * 100);
  
  return { discount, percentage };
}

/**
 * แปลงวันที่เป็นรูปแบบที่อ่านได้ (ภาษาไทย)
 */
function formatDateThai(date) {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = thaiMonths[dateObj.getMonth()];
  const year = dateObj.getFullYear() + 543; // แปลงเป็น พ.ศ.
  
  return `${day} ${month} ${year}`;
}

/**
 * แปลงวันที่แบบสัมพันธ์ (เช่น "2 วันที่แล้ว")
 */
function formatRelativeTime(date) {
  return moment(date).locale('th').fromNow();
}

/**
 * ตรวจสอบว่าเป็นอีเมลที่ถูกต้องหรือไม่
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * ตรวจสอบว่าเป็นเบอร์โทรที่ถูกต้องหรือไม่ (รูปแบบไทย)
 */
function isValidThaiPhoneNumber(phoneNumber) {
  const phoneRegex = /^(\+66|0)[0-9]{8,9}$/;
  return phoneRegex.test(phoneNumber.replace(/[-\s()]/g, ''));
}

/**
 * สร้าง Hash สำหรับรหัสผ่าน
 */
function hashPassword(password, saltRounds = 12) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hashSync(password, saltRounds);
}

/**
 * เปรียบเทียบรหัสผ่าน
 */
function comparePassword(password, hash) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compareSync(password, hash);
}

/**
 * แปลง Slug (URL-friendly string)
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // เอาตัวอักษรพิเศษออก
    .replace(/\s+/g, '-') // แทนที่ space ด้วย dash
    .replace(/-+/g, '-') // เอา dash ซ้ำออก
    .trim('-'); // เอา dash หน้าหลังออก
}

/**
 * สุ่มเลือกสินค้า
 */
function getRandomItems(array, count) {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * คำนวณ Pagination
 */
function calculatePagination(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, total);
  
  return {
    total,
    currentPage: page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
    limit
  };
}

/**
 * สร้าง Query String จาก Object
 */
function buildQueryString(params) {
  const queryParams = new URLSearchParams();
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => queryParams.append(key, item));
      } else {
        queryParams.set(key, value);
      }
    }
  });
  
  return queryParams.toString();
}

/**
 * แปลงขนาดไฟล์เป็นรูปแบบที่อ่านได้
 */
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
  
  return `${size} ${sizes[i]}`;
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * สร้าง Response Object มาตรฐาน
 */
function createResponse(success, message, data = null, error = null) {
  const response = { success, message };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (error !== null) {
    response.error = error;
  }
  
  return response;
}

/**
 * ตรวจสอบว่าเป็น MongoDB ObjectId หรือไม่
 */
function isValidObjectId(id) {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * แปลงสถานะเป็นภาษาไทย
 */
function translateStatus(status, type = 'order') {
  const translations = {
    order: {
      'pending': 'รอการยืนยัน',
      'confirmed': 'ยืนยันแล้ว',
      'processing': 'กำลังเตรียมสินค้า',
      'shipped': 'จัดส่งแล้ว',
      'delivered': 'ส่งถึงแล้ว',
      'cancelled': 'ยกเลิก',
      'refunded': 'คืนเงิน'
    },
    payment: {
      'pending': 'รอการชำระ',
      'completed': 'ชำระแล้ว',
      'failed': 'ชำระไม่สำเร็จ',
      'cancelled': 'ยกเลิกการชำระ',
      'refunded': 'คืนเงินแล้ว'
    },
    product: {
      'draft': 'ร่าง',
      'active': 'เปิดขาย',
      'inactive': 'ไม่เปิดขาย',
      'discontinued': 'หยุดจำหน่าย'
    }
  };
  
  return translations[type]?.[status] || status;
}

/**
 * สร้าง JWT Payload
 */
function createJWTPayload(user) {
  return {
    id: user._id || user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000) // issued at
  };
}

/**
 * แยกชื่อและนามสกุลจากชื่อเต็ม
 */
function splitFullName(fullName) {
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return { firstName, lastName };
}

module.exports = {
  generateRandomString,
  generateSKU,
  generateOrderNumber,
  formatPrice,
  calculateDiscount,
  formatDateThai,
  formatRelativeTime,
  isValidEmail,
  isValidThaiPhoneNumber,
  hashPassword,
  comparePassword,
  slugify,
  getRandomItems,
  calculatePagination,
  buildQueryString,
  formatFileSize,
  debounce,
  throttle,
  createResponse,
  isValidObjectId,
  translateStatus,
  createJWTPayload,
  splitFullName
};