/**
 * Order Controller - จัดการ CRUD operations สำหรับคำสั่งซื้อ
 * รวมถึงการจัดการสถานะ การชำระเงิน และการจัดส่ง
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

class OrderController {
  /**
   * ดูรายการคำสั่งซื้อทั้งหมด (Admin)
   * GET /api/orders
   */
  static async getAllOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        userId,
        search = '',
        startDate,
        endDate,
        sort = '-createdAt'
      } = req.query;

      // สร้าง query filters
      const filters = {};

      if (status) {
        filters.status = status;
      }

      if (userId) {
        filters.userId = userId;
      }

      if (search) {
        filters.$or = [
          { orderNumber: new RegExp(search, 'i') },
          { 'customerInfo.email': new RegExp(search, 'i') },
          { 'shippingAddress.firstName': new RegExp(search, 'i') },
          { 'shippingAddress.lastName': new RegExp(search, 'i') }
        ];
      }

      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate);
        if (endDate) filters.createdAt.$lte = new Date(endDate);
      }

      // ดำเนินการ query
      const orders = await Order.find(filters)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('userId', 'username email firstName lastName')
        .populate('items.product', 'name price images')
        .lean();

      const totalOrders = await Order.countDocuments(filters);
      const totalPages = Math.ceil(totalOrders / limit);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalOrders,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          },
          filters: {
            status,
            userId,
            search,
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงรายการคำสั่งซื้อ:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ดูข้อมูลคำสั่งซื้อรายเดียว
   * GET /api/orders/:id
   */
  static async getOrderById(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.findById(id)
        .populate('userId', 'username email firstName lastName phoneNumber')
        .populate('items.product', 'name price images sku')
        .populate('statusHistory.updatedBy', 'username');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำสั่งซื้อที่ต้องการ',
          error: 'ORDER_NOT_FOUND'
        });
      }

      // ตรวจสอบสิทธิ์ - ลูกค้าดูได้เฉพาะคำสั่งซื้อของตัวเอง
      if (req.user.role !== 'admin' && 
          req.user.role !== 'moderator' && 
          order.userId._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้',
          error: 'ACCESS_DENIED'
        });
      }

      res.json({
        success: true,
        data: { order }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ดูคำสั่งซื้อของผู้ใช้ปัจจุบัน
   * GET /api/orders/my-orders
   */
  static async getMyOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        sort = '-createdAt'
      } = req.query;

      const options = {
        status,
        page: parseInt(page),
        limit: parseInt(limit),
        sort
      };

      const orders = await Order.findByUser(req.user.id, options);

      const totalOrders = await Order.countDocuments({ 
        userId: req.user.id,
        ...(status ? { status } : {})
      });
      
      const totalPages = Math.ceil(totalOrders / limit);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalOrders,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงคำสั่งซื้อของผู้ใช้:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * สร้างคำสั่งซื้อใหม่
   * POST /api/orders
   */
  static async createOrder(req, res) {
    try {
      const {
        items,
        shippingAddress,
        billingAddress,
        payment = {},
        shipping = {},
        notes,
        couponCode
      } = req.body;

      // ตรวจสอบข้อมูลพื้นฐาน
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'คำสั่งซื้อต้องมีสินค้าอย่างน้อย 1 รายการ',
          error: 'NO_ITEMS'
        });
      }

      if (!shippingAddress) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกที่อยู่จัดส่ง',
          error: 'MISSING_SHIPPING_ADDRESS'
        });
      }

      // ตรวจสอบและประมวลผลรายการสินค้า
      const processedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await Product.findById(item.product);
        
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `ไม่พบสินค้า ID: ${item.product}`,
            error: 'PRODUCT_NOT_FOUND'
          });
        }

        if (product.status !== 'active' || !product.isActive) {
          return res.status(400).json({
            success: false,
            message: `สินค้า "${product.name}" ไม่พร้อมขาย`,
            error: 'PRODUCT_NOT_AVAILABLE'
          });
        }

        // ตรวจสอบสต็อก
        let availableStock = product.stock;
        let unitPrice = product.price;

        if (item.variant) {
          const variant = product.variants.id(item.variant.id);
          if (!variant || !variant.isActive) {
            return res.status(400).json({
              success: false,
              message: `ไม่พบตัวแปรสินค้าที่เลือก`,
              error: 'VARIANT_NOT_FOUND'
            });
          }
          availableStock = variant.stock;
          unitPrice += variant.priceAdjustment;
        }

        if (availableStock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `สินค้า "${product.name}" มีเหลือเพียง ${availableStock} ชิ้น`,
            error: 'INSUFFICIENT_STOCK'
          });
        }

        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        processedItems.push({
          product: product._id,
          productSnapshot: {
            name: product.name,
            price: product.price,
            image: product.primaryImage?.url || product.images[0]?.url,
            sku: product.sku
          },
          variant: item.variant,
          quantity: item.quantity,
          unitPrice,
          totalPrice
        });
      }

      // ดึงข้อมูลผู้ใช้
      const user = await User.findById(req.user.id);
      
      // คำนวณราคาและค่าใช้จ่าย
      const shippingCost = shipping.cost || 0;
      const taxAmount = 0; // สามารถคำนวณภาษีได้ตามต้องการ
      const discountAmount = 0; // สามารถประมวลผลคูปองส่วนลดได้
      const totalAmount = subtotal + shippingCost + taxAmount - discountAmount;

      // สร้างคำสั่งซื้อ
      const orderData = {
        userId: req.user.id,
        customerInfo: {
          email: user.email,
          phoneNumber: user.phoneNumber || shippingAddress.phoneNumber
        },
        items: processedItems,
        subtotal,
        taxAmount,
        discountAmount,
        shippingCost,
        totalAmount,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        payment: {
          method: payment.method || 'cash_on_delivery',
          provider: payment.provider || '',
          status: 'pending'
        },
        shipping: {
          method: shipping.method || 'standard',
          provider: shipping.provider || '',
          cost: shippingCost,
          status: 'pending'
        },
        notes,
        couponCode,
        source: req.headers['user-agent']?.includes('Mobile') ? 'mobile_app' : 'web'
      };

      const order = new Order(orderData);
      await order.save();

      // ลดจำนวนสต็อกสินค้า
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = await Product.findById(item.product);
        
        try {
          await product.decreaseStock(item.quantity, item.variant?.id);
        } catch (stockError) {
          // ถ้าลดสต็อกไม่ได้ ให้ยกเลิกคำสั่งซื้อ
          await Order.findByIdAndDelete(order._id);
          
          return res.status(400).json({
            success: false,
            message: stockError.message,
            error: 'STOCK_UPDATE_FAILED'
          });
        }
      }

      // ดึงข้อมูลคำสั่งซื้อที่สมบูรณ์
      const populatedOrder = await Order.findById(order._id)
        .populate('userId', 'username email')
        .populate('items.product', 'name price images');

      res.status(201).json({
        success: true,
        message: 'สร้างคำสั่งซื้อสำเร็จ',
        data: { order: populatedOrder }
      });

      console.log(`🛒 คำสั่งซื้อใหม่: ${order.orderNumber} (${totalAmount} บาท) โดย ${user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'ข้อมูลคำสั่งซื้อไม่ถูกต้อง',
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
   * อัปเดตสถานะคำสั่งซื้อ
   * PUT /api/orders/:id/status
   */
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;

      const validStatuses = [
        'pending', 'confirmed', 'processing', 
        'shipped', 'delivered', 'cancelled', 'refunded'
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'สถานะไม่ถูกต้อง',
          error: 'INVALID_STATUS'
        });
      }

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำสั่งซื้อที่ต้องการ',
          error: 'ORDER_NOT_FOUND'
        });
      }

      // ตรวจสอบสิทธิ์
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์แก้ไขสถานะคำสั่งซื้อ',
          error: 'ACCESS_DENIED'
        });
      }

      await order.updateStatus(status, note, req.user.id);

      // ดึงข้อมูลคำสั่งซื้อที่อัปเดต
      const updatedOrder = await Order.findById(id)
        .populate('userId', 'username email')
        .populate('statusHistory.updatedBy', 'username');

      res.json({
        success: true,
        message: 'อัปเดตสถานะสำเร็จ',
        data: { order: updatedOrder }
      });

      console.log(`📋 อัปเดตสถานะ: ${order.orderNumber} -> ${status} โดย ${req.user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * ยกเลิกคำสั่งซื้อ
   * PUT /api/orders/:id/cancel
   */
  static async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await Order.findById(id).populate('items.product');
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำสั่งซื้อที่ต้องการ',
          error: 'ORDER_NOT_FOUND'
        });
      }

      // ตรวจสอบสิทธิ์
      if (req.user.role !== 'admin' && 
          req.user.role !== 'moderator' && 
          order.userId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'ไม่มีสิทธิ์ยกเลิกคำสั่งซื้อนี้',
          error: 'ACCESS_DENIED'
        });
      }

      // ตรวจสอบว่าสามารถยกเลิกได้หรือไม่
      if (!order.canCancel()) {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถยกเลิกคำสั่งซื้อนี้ได้',
          error: 'CANNOT_CANCEL'
        });
      }

      // คืนจำนวนสต็อกสินค้า
      for (const item of order.items) {
        const product = await Product.findById(item.product._id);
        if (product) {
          await product.increaseStock(item.quantity, item.variant?.id);
        }
      }

      await order.cancel(reason || 'ยกเลิกโดยลูกค้า', req.user.id);

      res.json({
        success: true,
        message: 'ยกเลิกคำสั่งซื้อสำเร็จ',
        data: { order }
      });

      console.log(`❌ ยกเลิกคำสั่งซื้อ: ${order.orderNumber} โดย ${req.user.username}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อ:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * อัปเดตข้อมูลการชำระเงิน
   * PUT /api/orders/:id/payment
   */
  static async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const paymentData = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำสั่งซื้อที่ต้องการ',
          error: 'ORDER_NOT_FOUND'
        });
      }

      await order.updatePayment(paymentData);

      res.json({
        success: true,
        message: 'อัปเดตข้อมูลการชำระเงินสำเร็จ',
        data: { order }
      });

      console.log(`💳 อัปเดตการชำระเงิน: ${order.orderNumber} -> ${paymentData.status}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดตการชำระเงิน:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * อัปเดตข้อมูลการจัดส่ง
   * PUT /api/orders/:id/shipping
   */
  static async updateShipping(req, res) {
    try {
      const { id } = req.params;
      const { trackingNumber, provider, estimatedDelivery } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำสั่งซื้อที่ต้องการ',
          error: 'ORDER_NOT_FOUND'
        });
      }

      await order.ship(trackingNumber, provider, req.user.id);

      if (estimatedDelivery) {
        order.shipping.estimatedDelivery = new Date(estimatedDelivery);
        await order.save();
      }

      res.json({
        success: true,
        message: 'อัปเดตข้อมูลการจัดส่งสำเร็จ',
        data: { order }
      });

      console.log(`🚚 อัปเดตการจัดส่ง: ${order.orderNumber} -> ${trackingNumber}`);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดตการจัดส่ง:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * รายงานยอดขาย
   * GET /api/orders/reports/sales
   */
  static async getSalesReport(req, res) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 วันที่ผ่านมา
        endDate = new Date()
      } = req.query;

      const report = await Order.getSalesReport(startDate, endDate);

      res.json({
        success: true,
        data: {
          report,
          period: {
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการสร้างรายงาน:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }

  /**
   * สถิติคำสั่งซื้อ
   * GET /api/orders/stats
   */
  static async getOrderStats(req, res) {
    try {
      const stats = await Order.getStats();
      const recentOrders = await Order.getRecent(5);

      res.json({
        success: true,
        data: {
          stats,
          recentOrders
        }
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงสถิติ:', error);

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: error.message
      });
    }
  }
}

module.exports = OrderController;