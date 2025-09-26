/**
 * Order Model - แบบจำลองข้อมูลคำสั่งซื้อ
 * จัดการคำสั่งซื้อ การชำระเงิน และสถานะการจัดส่ง
 */

const mongoose = require('mongoose');

// Schema สำหรับที่อยู่จัดส่ง
const shippingAddressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  street: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    default: 'Thailand',
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  }
}, { _id: false });

// Schema สำหรับรายการสินค้าในคำสั่งซื้อ
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productSnapshot: {
    name: String,
    price: Number,
    image: String,
    sku: String,
    // เก็บข้อมูลสินค้าตอนสั่งซื้อ เพื่อป้องกันการเปลี่ยนแปลง
  },
  variant: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    value: String,
    priceAdjustment: {
      type: Number,
      default: 0
    }
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'จำนวนสินค้าต้องไม่น้อยกว่า 1'],
    validate: {
      validator: Number.isInteger,
      message: 'จำนวนสินค้าต้องเป็นจำนวนเต็ม'
    }
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'ราคาต่อหน่วยต้องไม่น้อยกว่า 0']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'ราคารวมต้องไม่น้อยกว่า 0']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
    default: 'pending'
  }
});

// Schema สำหรับข้อมูลการชำระเงิน
const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: [
      'credit_card',
      'debit_card', 
      'bank_transfer',
      'mobile_banking',
      'e_wallet',
      'cash_on_delivery',
      'installment'
    ]
  },
  provider: {
    type: String, // เช่น 'visa', 'mastercard', 'promptpay', 'truemoney'
    trim: true
  },
  transactionId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  referenceId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paidAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  paidAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Schema สำหรับข้อมูลการจัดส่ง
const shippingSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ['standard', 'express', 'overnight', 'pickup'],
    default: 'standard'
  },
  provider: {
    type: String, // เช่น 'Thailand Post', 'Kerry', 'DHL'
    trim: true
  },
  cost: {
    type: Number,
    min: 0,
    default: 0
  },
  estimatedDelivery: {
    type: Date
  },
  trackingNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'in_transit', 'delivered', 'failed'],
    default: 'pending'
  },
  shippedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
});

// หลัก Order Schema
const orderSchema = new mongoose.Schema({
  // หมายเลขคำสั่งซื้อ
  orderNumber: {
    type: String,
    unique: true,
    uppercase: true
  },
  
  // ข้อมูลลูกค้า
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  customerInfo: {
    email: String,
    phoneNumber: String,
    // เก็บข้อมูลลูกค้าตอนสั่งซื้อ
  },

  // รายการสินค้า
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'คำสั่งซื้อต้องมีสินค้าอย่างน้อย 1 รายการ'
    }
  },

  // ข้อมูลราคา
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  taxAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  shippingCost: {
    type: Number,
    min: 0,
    default: 0
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    enum: ['THB', 'USD', 'EUR'],
    default: 'THB'
  },

  // สถานะคำสั่งซื้อ
  status: {
    type: String,
    enum: [
      'pending',        // รอการยืนยัน
      'confirmed',      // ยืนยันแล้ว
      'processing',     // กำลังเตรียมสินค้า
      'shipped',        // จัดส่งแล้ว
      'delivered',      // ส่งถึงแล้ว
      'cancelled',      // ยกเลิก
      'refunded',       // คืนเงิน
      'disputed'        // มีข้อพิพาท
    ],
    default: 'pending'
  },

  // ข้อมูลการจัดส่ง
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  
  billingAddress: {
    type: shippingAddressSchema
    // ถ้าไม่กรอก จะใช้ shippingAddress
  },

  shipping: shippingSchema,
  
  // ข้อมูลการชำระเงิน
  payment: paymentSchema,

  // หมายเหตุและข้อมูลเพิ่มเติม
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'หมายเหตุต้องมีไม่เกิน 500 ตัวอักษร']
  },
  
  adminNotes: {
    type: String,
    trim: true,
    select: false // ซ่อนจากลูกค้า
  },

  // โค้ดส่วนลดที่ใช้
  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },

  // ข้อมูล Metadata
  source: {
    type: String,
    enum: ['web', 'mobile_app', 'pos', 'phone', 'admin'],
    default: 'web'
  },
  
  tags: [{
    type: String,
    trim: true
  }],

  // วันที่สำคัญ
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  
  // การติดตาม
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields

/**
 * ข้อมูลลูกค้าเต็ม
 */
orderSchema.virtual('customer', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

/**
 * จำนวนสินค้าทั้งหมด
 */
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

/**
 * น้ำหนักรวม
 */
orderSchema.virtual('totalWeight').get(function() {
  // ต้องมีการ populate product ก่อน
  return this.items.reduce((total, item) => {
    const productWeight = item.product?.weight || 0;
    return total + (productWeight * item.quantity);
  }, 0);
});

/**
 * สถานะแสดงผลภาษาไทย
 */
orderSchema.virtual('statusText').get(function() {
  const statusMap = {
    'pending': 'รอการยืนยัน',
    'confirmed': 'ยืนยันแล้ว',
    'processing': 'กำลังเตรียมสินค้า',
    'shipped': 'จัดส่งแล้ว',
    'delivered': 'ส่งถึงแล้ว',
    'cancelled': 'ยกเลิก',
    'refunded': 'คืนเงิน',
    'disputed': 'มีข้อพิพาท'
  };
  return statusMap[this.status] || this.status;
});

/**
 * สถานะการชำระเงินภาษาไทย
 */
orderSchema.virtual('paymentStatusText').get(function() {
  const statusMap = {
    'pending': 'รอการชำระ',
    'completed': 'ชำระแล้ว',
    'failed': 'ชำระไม่สำเร็จ',
    'cancelled': 'ยกเลิกการชำระ',
    'refunded': 'คืนเงินแล้ว'
  };
  return statusMap[this.payment?.status] || 'ไม่ทราบสถานะ';
});

/**
 * ที่อยู่สำหรับเรียกเก็บเงิน (ถ้าไม่มีจะใช้ที่อยู่จัดส่ง)
 */
orderSchema.virtual('effectiveBillingAddress').get(function() {
  return this.billingAddress || this.shippingAddress;
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'shipping.status': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ totalAmount: -1 });
orderSchema.index({ couponCode: 1 });

// Pre-save middleware

/**
 * สร้างหมายเลขคำสั่งซื้อ
 */
orderSchema.pre('save', function(next) {
  if (!this.orderNumber && this.isNew) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    this.orderNumber = `ORD${year}${month}${random}`;
  }
  next();
});

/**
 * คำนวณยอดรวมทั้งหมด
 */
orderSchema.pre('save', function(next) {
  // คำนวณ subtotal จาก items
  this.subtotal = this.items.reduce((total, item) => {
    return total + item.totalPrice;
  }, 0);
  
  // คำนวณยอดรวมสุดท้าย
  this.totalAmount = this.subtotal + this.taxAmount + this.shippingCost - this.discountAmount;
  
  // ตรวจสอบให้ยอดรวมไม่ติดลบ
  if (this.totalAmount < 0) {
    this.totalAmount = 0;
  }
  
  next();
});

/**
 * อัปเดตที่อยู่สำหรับเรียกเก็บเงิน
 */
orderSchema.pre('save', function(next) {
  // ถ้าไม่มีที่อยู่เรียกเก็บเงิน ให้ใช้ที่อยู่จัดส่ง
  if (!this.billingAddress && this.shippingAddress) {
    this.billingAddress = this.shippingAddress.toObject();
  }
  next();
});

/**
 * อัปเดตสถิติสินค้า
 */
orderSchema.pre('save', function(next) {
  // คำนวณยอดแต่ละรายการ
  this.items.forEach(item => {
    if (!item.totalPrice || item.isModified('quantity') || item.isModified('unitPrice')) {
      const basePrice = item.unitPrice + (item.variant?.priceAdjustment || 0);
      item.totalPrice = basePrice * item.quantity;
    }
  });
  
  next();
});

/**
 * บันทึกประวัติสถานะ
 */
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: `สถานะเปลี่ยนเป็น: ${this.statusText}`
    });
    
    // อัปเดตวันที่ตามสถานะ
    const now = new Date();
    switch (this.status) {
      case 'confirmed':
        this.confirmedAt = now;
        break;
      case 'shipped':
        this.shippedAt = now;
        this.shipping.shippedAt = now;
        break;
      case 'delivered':
        this.deliveredAt = now;
        this.shipping.deliveredAt = now;
        break;
      case 'cancelled':
        this.cancelledAt = now;
        break;
    }
  }
  next();
});

// Instance methods

/**
 * อัปเดตสถานะคำสั่งซื้อ
 */
orderSchema.methods.updateStatus = function(newStatus, note, updatedBy) {
  this.status = newStatus;
  
  if (note || updatedBy) {
    const historyEntry = {
      status: newStatus,
      timestamp: new Date()
    };
    
    if (note) historyEntry.note = note;
    if (updatedBy) historyEntry.updatedBy = updatedBy;
    
    this.statusHistory.push(historyEntry);
  }
  
  return this.save();
};

/**
 * ยืนยันคำสั่งซื้อ
 */
orderSchema.methods.confirm = function(note, updatedBy) {
  return this.updateStatus('confirmed', note || 'คำสั่งซื้อได้รับการยืนยัน', updatedBy);
};

/**
 * ยกเลิกคำสั่งซื้อ
 */
orderSchema.methods.cancel = function(reason, updatedBy) {
  return this.updateStatus('cancelled', reason || 'คำสั่งซื้อถูกยกเลิก', updatedBy);
};

/**
 * จัดส่งคำสั่งซื้อ
 */
orderSchema.methods.ship = function(trackingNumber, carrier, updatedBy) {
  if (trackingNumber) {
    this.shipping.trackingNumber = trackingNumber;
  }
  if (carrier) {
    this.shipping.provider = carrier;
  }
  
  this.shipping.status = 'shipped';
  
  return this.updateStatus('shipped', 'สินค้าถูกจัดส่งแล้ว', updatedBy);
};

/**
 * ส่งมอบคำสั่งซื้อ
 */
orderSchema.methods.deliver = function(note, updatedBy) {
  this.shipping.status = 'delivered';
  return this.updateStatus('delivered', note || 'สินค้าส่งมอบเรียบร้อย', updatedBy);
};

/**
 * อัปเดตการชำระเงิน
 */
orderSchema.methods.updatePayment = function(paymentData) {
  Object.assign(this.payment, paymentData);
  
  if (paymentData.status === 'completed' && !this.payment.paidAt) {
    this.payment.paidAt = new Date();
  }
  
  return this.save();
};

/**
 * คำนวณจำนวนวันที่ใช้ในการประมวลผล
 */
orderSchema.methods.getProcessingDays = function() {
  if (!this.confirmedAt) return 0;
  
  const endDate = this.deliveredAt || new Date();
  const startDate = this.confirmedAt;
  
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
};

/**
 * ตรวจสอบว่าสามารถยกเลิกได้หรือไม่
 */
orderSchema.methods.canCancel = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

/**
 * ตรวจสอบว่าสามารถคืนเงินได้หรือไม่
 */
orderSchema.methods.canRefund = function() {
  return ['delivered', 'shipped'].includes(this.status) && 
         this.payment.status === 'completed';
};

// Static methods

/**
 * ค้นหาคำสั่งซื้อของผู้ใช้
 */
orderSchema.statics.findByUser = function(userId, options = {}) {
  const { status, page = 1, limit = 10, sort = '-createdAt' } = options;
  
  let query = { userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('items.product', 'name price images')
    .lean();
};

/**
 * รายงานยอดขายตามช่วงเวลา
 */
orderSchema.statics.getSalesReport = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        totalItems: { $sum: { $sum: '$items.quantity' } }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

/**
 * สถิติคำสั่งซื้อ
 */
orderSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        confirmedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        shippedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
        },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0
  };
};

/**
 * คำสั่งซื้อล่าสุด
 */
orderSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort('-createdAt')
    .limit(limit)
    .populate('userId', 'username email')
    .populate('items.product', 'name price images')
    .lean();
};

module.exports = mongoose.model('Order', orderSchema);