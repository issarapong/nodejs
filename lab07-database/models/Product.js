/**
 * Product Model - แบบจำลองข้อมูลสินค้า
 * จัดการข้อมูลสินค้า หมวดหมู่ และการจัดการคลังสินค้า
 */

const mongoose = require('mongoose');

// Schema สำหรับรีวิวสินค้า
const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'คะแนนรีวิวจำเป็นต้องกรอก'],
    min: [1, 'คะแนนต่ำสุดคือ 1'],
    max: [5, 'คะแนนสูงสุดคือ 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'ความคิดเห็นต้องมีไม่เกิน 500 ตัวอักษร']
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Schema สำหรับข้อมูลจำเพาะของสินค้า
const specificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    trim: true
  }
}, { _id: false });

// Schema สำหรับตัวแปรสินค้า (เช่น สี, ขนาด)
const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  priceAdjustment: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// หลัก Product Schema
const productSchema = new mongoose.Schema({
  // ข้อมูลพื้นฐานสินค้า
  name: {
    type: String,
    required: [true, 'ชื่อสินค้าจำเป็นต้องกรอก'],
    trim: true,
    maxlength: [100, 'ชื่อสินค้าต้องมีไม่เกิน 100 ตัวอักษร']
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  description: {
    type: String,
    required: [true, 'รายละเอียดสินค้าจำเป็นต้องกรอก'],
    trim: true,
    maxlength: [2000, 'รายละเอียดต้องมีไม่เกิน 2000 ตัวอักษร']
  },
  
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'รายละเอียดย่อต้องมีไม่เกิน 200 ตัวอักษร']
  },

  // ราคาและต้นทุน
  price: {
    type: Number,
    required: [true, 'ราคาสินค้าจำเป็นต้องกรอก'],
    min: [0, 'ราคาต้องไม่น้อยกว่า 0']
  },
  
  originalPrice: {
    type: Number,
    min: [0, 'ราคาเดิมต้องไม่น้อยกว่า 0']
  },
  
  cost: {
    type: Number,
    min: [0, 'ต้นทุนต้องไม่น้อยกว่า 0'],
    select: false // ซ่อนจาก API ปกติ
  },
  
  currency: {
    type: String,
    enum: ['THB', 'USD', 'EUR'],
    default: 'THB'
  },

  // หมวดหมู่และการจัดหมวดหมู่
  category: {
    type: String,
    required: [true, 'หมวดหมู่สินค้าจำเป็นต้องกรอก'],
    trim: true,
    lowercase: true,
    enum: [
      'electronics',
      'clothing',
      'books',
      'home-garden',
      'sports',
      'automotive',
      'toys-games',
      'health-beauty',
      'food-beverages',
      'other'
    ]
  },
  
  subcategory: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'แบรนด์ต้องมีไม่เกิน 50 ตัวอักษร']
  },

  // รูปภาพและสื่อ
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  videos: [{
    url: String,
    title: String,
    duration: Number
  }],

  // คลังสินค้าและการจัดส่ง
  stock: {
    type: Number,
    required: [true, 'จำนวนสินค้าคงเหลือจำเป็นต้องกรอก'],
    min: [0, 'สินค้าคงเหลือต้องไม่น้อยกว่า 0'],
    default: 0
  },
  
  minStock: {
    type: Number,
    default: 5,
    min: [0, 'สินค้าคงเหลือขั้นต่ำต้องไม่น้อยกว่า 0']
  },
  
  maxStock: {
    type: Number,
    default: 1000,
    min: [1, 'สินค้าคงเหลือสูงสุดต้องไม่น้อยกว่า 1']
  },
  
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  
  barcode: {
    type: String,
    trim: true
  },

  // ข้อมูลการจัดส่งและขนาด
  weight: {
    type: Number,
    min: [0, 'น้ำหนักต้องไม่น้อยกว่า 0'],
    default: 0
  },
  
  dimensions: {
    length: { type: Number, min: 0, default: 0 },
    width: { type: Number, min: 0, default: 0 },
    height: { type: Number, min: 0, default: 0 },
    unit: { type: String, enum: ['cm', 'inch'], default: 'cm' }
  },
  
  shippingClass: {
    type: String,
    enum: ['standard', 'express', 'fragile', 'hazardous'],
    default: 'standard'
  },

  // ข้อมูลจำเพาะและตัวแปร
  specifications: [specificationSchema],
  variants: [variantSchema],

  // สถานะและการเผยแพร่
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'discontinued'],
    default: 'draft'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  isDigital: {
    type: Boolean,
    default: false
  },

  // SEO และ metadata
  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: [70, 'SEO title ต้องมีไม่เกิน 70 ตัวอักษร']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [160, 'SEO description ต้องมีไม่เกิน 160 ตัวอักษร']
    },
    keywords: [{
      type: String,
      trim: true
    }]
  },

  // รีวิวและคะแนน
  reviews: [reviewSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // การวิเคราะห์และสถิติ
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  
  salesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  wishlistCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // ผู้สร้างและแก้ไข
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields

/**
 * ราคาหลังหักส่วนลด
 */
productSchema.virtual('discountPrice').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return this.price;
  }
  return null;
});

/**
 * เปอร์เซ็นต์ส่วนลด
 */
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

/**
 * สถานะสินค้าคงเหลือ
 */
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.minStock) return 'low_stock';
  return 'in_stock';
});

/**
 * รูปภาพหลัก
 */
productSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary || this.images[0] || null;
});

/**
 * ปริมาตร (สำหรับการคำนวณการจัดส่ง)
 */
productSchema.virtual('volume').get(function() {
  const { length, width, height } = this.dimensions;
  return length * width * height;
});

/**
 * จำนวนสินค้าคงเหลือรวมทั้งตัวแปร
 */
productSchema.virtual('totalStock').get(function() {
  const variantStock = this.variants.reduce((total, variant) => {
    return total + (variant.isActive ? variant.stock : 0);
  }, 0);
  return this.stock + variantStock;
});

// Indexes สำหรับการค้นหาและประสิทธิภาพ
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ status: 1, isActive: 1 });
productSchema.index({ isFeatured: -1, createdAt: -1 });
productSchema.index({ averageRating: -1, reviewCount: -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 });

// Pre-save middleware

/**
 * สร้าง slug อัตโนมัติ
 */
productSchema.pre('save', function(next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // เอาตัวอักษรพิเศษออก
      .replace(/\s+/g, '-') // แทนที่ space ด้วย dash
      .replace(/-+/g, '-') // เอา dash ซ้ำออก
      .trim();
    
    // เพิ่มเลขสุ่มถ้า slug ซ้ำ
    if (!this.slug) {
      this.slug = 'product-' + Date.now();
    }
  }
  next();
});

/**
 * คำนวณ average rating
 */
productSchema.pre('save', function(next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.reviewCount = this.reviews.length;
  } else {
    this.averageRating = 0;
    this.reviewCount = 0;
  }
  next();
});

/**
 * ตรวจสอบรูปภาพหลัก
 */
productSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    
    if (primaryImages.length === 0) {
      // ถ้าไม่มีรูปภาพหลัก ให้รูปแรกเป็นหลัก
      this.images[0].isPrimary = true;
    } else if (primaryImages.length > 1) {
      // ถ้ามีหลายรูปเป็นหลัก ให้เหลือรูปแรกเท่านั้น
      this.images.forEach((img, index) => {
        img.isPrimary = index === 0;
      });
    }
  }
  next();
});

// Instance methods

/**
 * เพิ่มรีวิว
 */
productSchema.methods.addReview = function(userId, rating, comment) {
  // ตรวจสอบว่าผู้ใช้เคยรีวิวแล้วหรือไม่
  const existingReview = this.reviews.find(
    review => review.userId.toString() === userId.toString()
  );
  
  if (existingReview) {
    // อัปเดตรีวิวเดิม
    existingReview.rating = rating;
    existingReview.comment = comment;
  } else {
    // เพิ่มรีวิวใหม่
    this.reviews.push({
      userId,
      rating,
      comment,
      isVerifiedPurchase: false // จะต้องตรวจสอบจากคำสั่งซื้อ
    });
  }
  
  return this.save();
};

/**
 * ลบรีวิว
 */
productSchema.methods.removeReview = function(userId) {
  this.reviews = this.reviews.filter(
    review => review.userId.toString() !== userId.toString()
  );
  return this.save();
};

/**
 * อัปเดตจำนวนการดู
 */
productSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

/**
 * อัปเดตจำนวนการขาย
 */
productSchema.methods.incrementSales = function(quantity = 1) {
  this.salesCount += quantity;
  return this.save();
};

/**
 * ลดจำนวนสินค้าคงเหลือ
 */
productSchema.methods.decreaseStock = function(quantity = 1, variantId = null) {
  if (variantId) {
    // ลดสต็อกของตัวแปรสินค้า
    const variant = this.variants.id(variantId);
    if (variant && variant.stock >= quantity) {
      variant.stock -= quantity;
    } else {
      throw new Error('สินค้าในตัวแปรนี้ไม่เพียงพอ');
    }
  } else {
    // ลดสต็อกหลัก
    if (this.stock >= quantity) {
      this.stock -= quantity;
    } else {
      throw new Error('สินค้าไม่เพียงพอ');
    }
  }
  
  return this.save();
};

/**
 * เพิ่มจำนวนสินค้าคงเหลือ
 */
productSchema.methods.increaseStock = function(quantity = 1, variantId = null) {
  if (variantId) {
    const variant = this.variants.id(variantId);
    if (variant) {
      variant.stock += quantity;
    }
  } else {
    this.stock += quantity;
  }
  
  return this.save();
};

// Static methods

/**
 * ค้นหาสินค้าด้วย text search
 */
productSchema.statics.search = function(query, options = {}) {
  const {
    category,
    minPrice,
    maxPrice,
    brand,
    inStock,
    sort = '-createdAt',
    page = 1,
    limit = 12
  } = options;
  
  let searchQuery = {
    status: 'active',
    isActive: true
  };
  
  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  // Filters
  if (category) {
    searchQuery.category = category;
  }
  
  if (brand) {
    searchQuery.brand = new RegExp(brand, 'i');
  }
  
  if (minPrice !== undefined || maxPrice !== undefined) {
    searchQuery.price = {};
    if (minPrice !== undefined) searchQuery.price.$gte = minPrice;
    if (maxPrice !== undefined) searchQuery.price.$lte = maxPrice;
  }
  
  if (inStock) {
    searchQuery.stock = { $gt: 0 };
  }
  
  return this.find(searchQuery)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('createdBy', 'username')
    .lean();
};

/**
 * สินค้าแนะนำ
 */
productSchema.statics.getFeatured = function(limit = 10) {
  return this.find({
    status: 'active',
    isActive: true,
    isFeatured: true
  })
  .sort('-salesCount -averageRating')
  .limit(limit)
  .populate('createdBy', 'username');
};

/**
 * สินค้าขายดี
 */
productSchema.statics.getBestSellers = function(limit = 10) {
  return this.find({
    status: 'active',
    isActive: true
  })
  .sort('-salesCount -averageRating')
  .limit(limit)
  .populate('createdBy', 'username');
};

/**
 * สินค้าใหม่
 */
productSchema.statics.getLatest = function(limit = 10) {
  return this.find({
    status: 'active',
    isActive: true
  })
  .sort('-createdAt')
  .limit(limit)
  .populate('createdBy', 'username');
};

/**
 * สถิติสินค้า
 */
productSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        activeProducts: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        inStock: {
          $sum: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] }
        },
        outOfStock: {
          $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
        },
        averagePrice: { $avg: '$price' },
        totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
      }
    }
  ]);
  
  return stats[0] || {
    totalProducts: 0,
    activeProducts: 0,
    inStock: 0,
    outOfStock: 0,
    averagePrice: 0,
    totalValue: 0
  };
};

module.exports = mongoose.model('Product', productSchema);