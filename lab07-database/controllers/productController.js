/**
 * Product Controller - จัดการ CRUD operations สำหรับสินค้า
 * รวมถึงการค้นหา การจัดการหมวดหมู่ และการจัดการรีวิว
 */

const Product = require('../models/Product');
const User = require('../models/User');

class ProductController {
  /**
   * ดูรายการสินค้าทั้งหมด
   * GET /api/products
   */
  static async getAllProducts(req, res) {
    try {
      const { 
        page = 1, 
        limit = 12,
        search = '',
        category = '',
        brand = '',
        minPrice,
        maxPrice,
        sort = '-createdAt',
        inStock
      } = req.query;

      // ใช้ static method search ของ model
      const options = {
        category,
        brand,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        inStock: inStock === 'true',
        sort,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const products = await Product.search(search, options);
      
      // นับจำนวนทั้งหมดสำหรับ pagination
      const filters = {
        status: 'active',
        isActive: true
      };
      
      if (search) {
        filters.$text = { $search: search };
      }
      if (category) filters.category = category;
      if (brand) filters.brand = new RegExp(brand, 'i');
      if (minPrice !== undefined || maxPrice !== undefined) {
        filters.price = {};
        if (minPrice !== undefined) filters.price.$gte = parseFloat(minPrice);
        if (maxPrice !== undefined) filters.price.$lte = parseFloat(maxPrice);
      }
      if (inStock === 'true') {
        filters.stock = { $gt: 0 };
      }

      const totalProducts = await Product.countDocuments(filters);
      const totalPages = Math.ceil(totalProducts / limit);

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalProducts,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          },
          filters: {
            search,
            category,
            brand,
            minPrice,
            maxPrice,
            inStock,
            sort
          }
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงรายการสินค้า:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ดูข้อมูลสินค้ารายเดียว
   * GET /api/products/:id
   */
  static async getProductById(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findById(id)
        .populate('createdBy', 'username email')
        .populate('reviews.userId', 'username avatar');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ต้องการ',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      // เพิ่มจำนวนการดู
      await product.incrementViews();

      res.json({
        success: true,
        data: { product }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ดูสินค้าด้วย slug
   * GET /api/products/slug/:slug
   */
  static async getProductBySlug(req, res) {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({ slug, status: 'active', isActive: true })
        .populate('createdBy', 'username email')
        .populate('reviews.userId', 'username avatar');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ต้องการ',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      // เพิ่มจำนวนการดู
      await product.incrementViews();

      res.json({
        success: true,
        data: { product }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * สร้างสินค้าใหม่
   * POST /api/products
   */
  static async createProduct(req, res) {
    try {
      const productData = {
        ...req.body,
        createdBy: req.user.id
      };

      const product = new Product(productData);
      await product.save();

      // Populate ข้อมูลผู้สร้าง
      await product.populate('createdBy', 'username email');

      res.status(201).json({
        success: true,
        message: 'สร้างสินค้าใหม่สำเร็จ',
        data: { product }
      });

      console.log(`📦 สร้างสินค้าใหม่: ${product.name} โดย ${req.user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการสร้างสินค้า:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'ข้อมูลสินค้าไม่ถูกต้อง',
          errors
        });
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} นี้มีอยู่แล้วในระบบ`,
          error: 'DUPLICATE_KEY'
        });
      }

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * แก้ไขข้อมูลสินค้า
   * PUT /api/products/:id
   */
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: req.user.id,
        updatedAt: new Date()
      };

      const product = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'username email');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ต้องการ',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'อัปเดตข้อมูลสินค้าสำเร็จ',
        data: { product }
      });

      console.log(`📝 อัปเดตสินค้า: ${product.name} โดย ${req.user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดตสินค้า:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'ข้อมูลสินค้าไม่ถูกต้อง',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ลบสินค้า (soft delete)
   * DELETE /api/products/:id
   */
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findByIdAndUpdate(
        id,
        { 
          status: 'inactive',
          isActive: false,
          updatedBy: req.user.id,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ต้องการ',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'ลบสินค้าสำเร็จ',
        data: { product }
      });

      console.log(`🗑️ ลบสินค้า: ${product.name} โดย ${req.user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการลบสินค้า:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * สินค้าแนะนำ
   * GET /api/products/featured
   */
  static async getFeaturedProducts(req, res) {
    try {
      const { limit = 10 } = req.query;

      const products = await Product.getFeatured(parseInt(limit));

      res.json({
        success: true,
        data: { products }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงสินค้าแนะนำ:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * สินค้าขายดี
   * GET /api/products/bestsellers
   */
  static async getBestSellers(req, res) {
    try {
      const { limit = 10 } = req.query;

      const products = await Product.getBestSellers(parseInt(limit));

      res.json({
        success: true,
        data: { products }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงสินค้าขายดี:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * สินค้าใหม่
   * GET /api/products/latest
   */
  static async getLatestProducts(req, res) {
    try {
      const { limit = 10 } = req.query;

      const products = await Product.getLatest(parseInt(limit));

      res.json({
        success: true,
        data: { products }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงสินค้าใหม่:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ค้นหาสินค้า
   * GET /api/products/search
   */
  static async searchProducts(req, res) {
    try {
      const { q = '', ...options } = req.query;

      if (!q.trim()) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาใส่คำค้นหา',
          error: 'MISSING_SEARCH_QUERY'
        });
      }

      const products = await Product.search(q, {
        ...options,
        page: parseInt(options.page) || 1,
        limit: parseInt(options.limit) || 12
      });

      res.json({
        success: true,
        data: {
          products,
          query: q,
          count: products.length
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการค้นหาสินค้า:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ดูสินค้าตามหมวดหมู่
   * GET /api/products/category/:category
   */
  static async getProductsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { 
        page = 1, 
        limit = 12, 
        sort = '-createdAt' 
      } = req.query;

      const products = await Product.find({
        category: category.toLowerCase(),
        status: 'active',
        isActive: true
      })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('createdBy', 'username')
      .lean();

      const totalProducts = await Product.countDocuments({
        category: category.toLowerCase(),
        status: 'active',
        isActive: true
      });

      const totalPages = Math.ceil(totalProducts / limit);

      res.json({
        success: true,
        data: {
          products,
          category,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalProducts,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงสินค้าตามหมวดหมู่:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * เพิ่มรีวิวสินค้า
   * POST /api/products/:id/reviews
   */
  static async addReview(req, res) {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'คะแนนรีวิวต้องอยู่ระหว่าง 1-5',
          error: 'INVALID_RATING'
        });
      }

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ต้องการ',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      await product.addReview(req.user.id, rating, comment);

      // ดึงข้อมูลสินค้าใหม่พร้อมรีวิว
      const updatedProduct = await Product.findById(id)
        .populate('reviews.userId', 'username avatar');

      res.json({
        success: true,
        message: 'เพิ่มรีวิวสำเร็จ',
        data: {
          product: updatedProduct,
          averageRating: updatedProduct.averageRating,
          reviewCount: updatedProduct.reviewCount
        }
      });

      console.log(`⭐ รีวิวใหม่: ${product.name} (${rating}/5) โดย ${req.user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการเพิ่มรีวิว:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ลบรีวิวสินค้า
   * DELETE /api/products/:id/reviews
   */
  static async removeReview(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ต้องการ',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      await product.removeReview(req.user.id);

      res.json({
        success: true,
        message: 'ลบรีวิวสำเร็จ',
        data: {
          averageRating: product.averageRating,
          reviewCount: product.reviewCount
        }
      });

      console.log(`🗑️ ลบรีวิว: ${product.name} โดย ${req.user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการลบรีวิว:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * อัปเดตสต็อกสินค้า
   * PUT /api/products/:id/stock
   */
  static async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, operation = 'set', variantId } = req.body;

      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'จำนวนสต็อกต้องเป็นตัวเลขและไม่ติดลบ',
          error: 'INVALID_QUANTITY'
        });
      }

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ต้องการ',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      // ดำเนินการตามประเภทที่ระบุ
      try {
        switch (operation) {
          case 'add':
            await product.increaseStock(quantity, variantId);
            break;
          case 'subtract':
            await product.decreaseStock(quantity, variantId);
            break;
          case 'set':
          default:
            if (variantId) {
              const variant = product.variants.id(variantId);
              if (variant) {
                variant.stock = quantity;
              }
            } else {
              product.stock = quantity;
            }
            await product.save();
        }

        res.json({
          success: true,
          message: 'อัปเดตสต็อกสำเร็จ',
          data: {
            product,
            totalStock: product.totalStock
          }
        });

        console.log(`📊 อัปเดตสต็อก: ${product.name} = ${quantity} (${operation})`);
      } catch (stockError) {
        return res.status(400).json({
          success: false,
          message: stockError.message,
          error: 'INSUFFICIENT_STOCK'
        });
      }
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดตสต็อก:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * สถิติสินค้า (Admin)
   * GET /api/products/stats
   */
  static async getProductStats(req, res) {
    try {
      const stats = await Product.getStats();

      // หมวดหมู่ที่ได้รับความนิยม
      const categoryStats = await Product.aggregate([
        { $match: { status: 'active', isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
            averagePrice: { $avg: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      res.json({
        success: true,
        data: {
          stats,
          categoryStats
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงสถิติสินค้า:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ดึงรายการหมวดหมู่ทั้งหมด
   * GET /api/products/categories
   */
  static async getCategories(req, res) {
    try {
      const categories = await Product.aggregate([
        { $match: { status: 'active', isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            subcategories: { $addToSet: '$subcategory' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงหมวดหมู่:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }
}

module.exports = ProductController;