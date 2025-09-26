/**
 * Database Seeder - เพิ่มข้อมูลตัวอย่างลงฐานข้อมูล
 * รันคำสั่ง: npm run seed
 */

require('dotenv').config();
const { database } = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * ข้อมูลผู้ใช้ตัวอย่าง
 */
const sampleUsers = [
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin123',
    firstName: 'Admin',
    lastName: 'System',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    phoneNumber: '0812345678',
    addresses: [{
      type: 'home',
      street: '123 ถนนสีลม',
      city: 'กรุงเทพฯ',
      postalCode: '10500',
      country: 'Thailand',
      isDefault: true
    }]
  },
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'Password123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    isActive: true,
    isEmailVerified: true,
    phoneNumber: '0823456789',
    dateOfBirth: new Date('1990-05-15'),
    addresses: [{
      type: 'home',
      street: '456 ถนนสุขุมวิท',
      city: 'กรุงเทพฯ',
      postalCode: '10110',
      country: 'Thailand',
      isDefault: true
    }]
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'Password123',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'user',
    isActive: true,
    isEmailVerified: true,
    phoneNumber: '0834567890',
    dateOfBirth: new Date('1992-08-20'),
    addresses: [{
      type: 'home',
      street: '789 ถนนรัชดาภิเษก',
      city: 'กรุงเทพฯ',
      postalCode: '10310',
      country: 'Thailand',
      isDefault: true
    }]
  },
  {
    username: 'moderator',
    email: 'moderator@example.com',
    password: 'Moderator123',
    firstName: 'Moderator',
    lastName: 'User',
    role: 'moderator',
    isActive: true,
    isEmailVerified: true,
    phoneNumber: '0845678901'
  }
];

/**
 * ข้อมูลสินค้าตัวอย่าง
 */
const sampleProducts = [
  {
    name: 'iPhone 15 Pro',
    description: 'มือถือรุ่นล่าสุดจาก Apple พร้อม A17 Pro chip และกล้อง 48MP',
    shortDescription: 'มือถือ Apple รุ่นล่าสุด',
    price: 39900,
    originalPrice: 42900,
    category: 'electronics',
    subcategory: 'smartphones',
    stock: 25,
    minStock: 5,
    brand: 'Apple',
    sku: 'IPHONE15PRO128',
    weight: 0.187,
    images: [
      { 
        url: 'https://via.placeholder.com/800x800/007bff/ffffff?text=iPhone+15+Pro', 
        alt: 'iPhone 15 Pro',
        isPrimary: true 
      }
    ],
    specifications: [
      { name: 'หน่วยประมวลผล', value: 'A17 Pro chip' },
      { name: 'หน่วยความจำ', value: '128GB' },
      { name: 'กล้องหลัก', value: '48MP' },
      { name: 'จอแสดงผล', value: '6.1 นิ้ว Super Retina XDR' }
    ],
    tags: ['smartphone', 'apple', 'ios', 'premium'],
    status: 'active',
    isFeatured: true,
    seo: {
      title: 'iPhone 15 Pro - มือถือ Apple รุ่นล่าสุด',
      description: 'iPhone 15 Pro พร้อม A17 Pro chip กล้อง 48MP ราคาดีที่สุด',
      keywords: ['iphone', 'apple', 'smartphone', 'ios']
    }
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    description: 'สมาร์ทโฟนเรือธงจาก Samsung พร้อม S Pen และกล้อง 200MP',
    shortDescription: 'Galaxy S24 Ultra พร้อม S Pen',
    price: 35900,
    category: 'electronics',
    subcategory: 'smartphones',
    stock: 30,
    brand: 'Samsung',
    sku: 'GALAXYS24ULTRA256',
    weight: 0.233,
    images: [
      { 
        url: 'https://via.placeholder.com/800x800/28a745/ffffff?text=Galaxy+S24+Ultra', 
        alt: 'Samsung Galaxy S24 Ultra',
        isPrimary: true 
      }
    ],
    specifications: [
      { name: 'หน่วยประมวลผล', value: 'Snapdragon 8 Gen 3' },
      { name: 'หน่วยความจำ', value: '256GB' },
      { name: 'กล้องหลัก', value: '200MP' },
      { name: 'จอแสดงผล', value: '6.8 นิ้ว Dynamic AMOLED 2X' }
    ],
    tags: ['smartphone', 'samsung', 'android', 's-pen'],
    status: 'active',
    isFeatured: true
  },
  {
    name: 'MacBook Air M3',
    description: 'แล็ปท็อป Apple ใหม่ล่าสุดพร้อม M3 chip ประสิทธิภาพสูง แบตเตอรี่ทนทาน',
    shortDescription: 'MacBook Air พร้อม M3 chip',
    price: 42900,
    originalPrice: 45900,
    category: 'electronics',
    subcategory: 'laptops',
    stock: 15,
    brand: 'Apple',
    sku: 'MACBOOKAIRM3256',
    weight: 1.24,
    images: [
      { 
        url: 'https://via.placeholder.com/800x800/6f42c1/ffffff?text=MacBook+Air+M3', 
        alt: 'MacBook Air M3',
        isPrimary: true 
      }
    ],
    specifications: [
      { name: 'หน่วยประมวลผล', value: 'Apple M3 chip' },
      { name: 'หน่วยความจำ', value: '256GB SSD' },
      { name: 'RAM', value: '8GB' },
      { name: 'จอแสดงผล', value: '13.6 นิ้ว Liquid Retina' }
    ],
    tags: ['laptop', 'apple', 'macbook', 'm3'],
    status: 'active',
    isFeatured: true
  },
  {
    name: 'เสื้อโปโลสีขาว',
    description: 'เสื้อโปโลคุณภาพดี ผ้าฝ้าย 100% สวมใส่สบาย เหมาะสำหรับงานและเที่ยว',
    shortDescription: 'เสื้อโปโลผ้าฝ้าย 100%',
    price: 890,
    category: 'clothing',
    subcategory: 'shirts',
    stock: 50,
    brand: 'BasicWear',
    sku: 'POLO-WHITE-L',
    weight: 0.25,
    images: [
      { 
        url: 'https://via.placeholder.com/800x800/ffffff/000000?text=Polo+Shirt', 
        alt: 'เสื้อโปโลสีขาว',
        isPrimary: true 
      }
    ],
    variants: [
      { name: 'Size', value: 'S', stock: 10, isActive: true },
      { name: 'Size', value: 'M', stock: 15, isActive: true },
      { name: 'Size', value: 'L', stock: 20, isActive: true },
      { name: 'Size', value: 'XL', stock: 5, isActive: true }
    ],
    specifications: [
      { name: 'วัสดุ', value: 'ผ้าฝ้าย 100%' },
      { name: 'การดูแล', value: 'ซักเครื่องปกติ' },
      { name: 'แบรนด์', value: 'BasicWear' }
    ],
    tags: ['เสื้อโปโล', 'เสื้อผ้า', 'ผ้าฝ้าย', 'casual'],
    status: 'active'
  },
  {
    name: 'หนังสือ "เรียน Node.js จากศูนย์"',
    description: 'หนังสือสอน Node.js สำหรับผู้เริ่มต้น ครอบคลุมตั้งแต่พื้นฐานไปจนถึงขั้นสูง',
    shortDescription: 'หนังสือสอน Node.js สำหรับผู้เริ่มต้น',
    price: 450,
    category: 'books',
    subcategory: 'programming',
    stock: 100,
    brand: 'TechBook',
    sku: 'BOOK-NODEJS-001',
    weight: 0.5,
    isDigital: false,
    images: [
      { 
        url: 'https://via.placeholder.com/800x600/ffc107/000000?text=Node.js+Book', 
        alt: 'หนังสือเรียน Node.js',
        isPrimary: true 
      }
    ],
    specifications: [
      { name: 'จำนวนหน้า', value: '350 หน้า' },
      { name: 'ผู้เขียน', value: 'นายเก่ง โปรแกรมเมอร์' },
      { name: 'สำนักพิมพ์', value: 'TechBook Publishing' },
      { name: 'ภาษา', value: 'ไทย' }
    ],
    tags: ['หนังสือ', 'nodejs', 'programming', 'javascript'],
    status: 'active'
  },
  {
    name: 'กระเป๋าเป้สะพายหลัง',
    description: 'กระเป๋าเป้สำหรับใส่โน้ตบุ๊ค มีช่องใส่ของหลายช่อง กันน้ำ เหมาะสำหรับทำงานและเที่ยว',
    shortDescription: 'กระเป๋าเป้ใส่โน้ตบุ๊ค กันน้ำ',
    price: 1290,
    category: 'other',
    subcategory: 'bags',
    stock: 20,
    brand: 'TravelGear',
    sku: 'BACKPACK-001',
    weight: 0.8,
    images: [
      { 
        url: 'https://via.placeholder.com/800x800/343a40/ffffff?text=Backpack', 
        alt: 'กระเป๋าเป้สะพายหลัง',
        isPrimary: true 
      }
    ],
    specifications: [
      { name: 'ความจุ', value: '25 ลิตร' },
      { name: 'วัสดุ', value: 'ผ้าไนลอนกันน้ำ' },
      { name: 'ขนาด', value: '45 x 30 x 15 ซม.' },
      { name: 'น้ำหนัก', value: '0.8 กก.' }
    ],
    tags: ['กระเป๋า', 'เป้', 'laptop', 'กันน้ำ', 'travel'],
    status: 'active'
  }
];

/**
 * สร้างผู้ใช้ตัวอย่าง
 */
async function seedUsers() {
  try {
    console.log('🔄 กำลังสร้างผู้ใช้ตัวอย่าง...');
    
    // ลบผู้ใช้เดิมทั้งหมด
    await User.deleteMany({});
    
    // สร้างผู้ใช้ใหม่
    const users = await User.create(sampleUsers);
    
    console.log(`✅ สร้างผู้ใช้ ${users.length} คน:`);
    users.forEach(user => {
      console.log(`   • ${user.username} (${user.role}) - ${user.email}`);
    });
    
    return users;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างผู้ใช้:', error.message);
    throw error;
  }
}

/**
 * สร้างสินค้าตัวอย่าง
 */
async function seedProducts(users) {
  try {
    console.log('🔄 กำลังสร้างสินค้าตัวอย่าง...');
    
    // ลบสินค้าเดิมทั้งหมด
    await Product.deleteMany({});
    
    // หา Admin user สำหรับเป็นผู้สร้างสินค้า
    const adminUser = users.find(user => user.role === 'admin');
    
    // เพิ่ม createdBy ให้สินค้าทั้งหมด
    const productsWithCreator = sampleProducts.map(product => ({
      ...product,
      createdBy: adminUser._id
    }));
    
    // สร้างสินค้าใหม่
    const products = await Product.create(productsWithCreator);
    
    console.log(`✅ สร้างสินค้า ${products.length} รายการ:`);
    products.forEach(product => {
      console.log(`   • ${product.name} - ${product.price} บาท (Stock: ${product.stock})`);
    });
    
    return products;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างสินค้า:', error.message);
    throw error;
  }
}

/**
 * สร้างรีวิวตัวอย่าง
 */
async function seedReviews(users, products) {
  try {
    console.log('🔄 กำลังสร้างรีวิวตัวอย่าง...');
    
    const sampleReviews = [
      { productIndex: 0, userIndex: 1, rating: 5, comment: 'สินค้าดีมาก คุณภาพเยี่ยม!' },
      { productIndex: 0, userIndex: 2, rating: 4, comment: 'ใช้งานได้ดี แต่ราคาสูงหน่อย' },
      { productIndex: 1, userIndex: 1, rating: 5, comment: 'กล้องคมชัด S Pen ใช้งานสะดวก' },
      { productIndex: 2, userIndex: 2, rating: 5, comment: 'MacBook เร็วมาก แบตเตอรี่ทนทาน' },
      { productIndex: 3, userIndex: 1, rating: 4, comment: 'เสื้อใส่สบาย ผ้านิ่ม' },
      { productIndex: 4, userIndex: 2, rating: 5, comment: 'หนังสือดี อ่านแล้วเข้าใจง่าย' }
    ];
    
    let reviewCount = 0;
    
    for (const review of sampleReviews) {
      const product = products[review.productIndex];
      const user = users[review.userIndex];
      
      if (product && user) {
        await product.addReview(user._id, review.rating, review.comment);
        reviewCount++;
      }
    }
    
    console.log(`✅ สร้างรีวิว ${reviewCount} รายการ`);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างรีวิว:', error.message);
    throw error;
  }
}

/**
 * สร้างคำสั่งซื้อตัวอย่าง
 */
async function seedOrders(users, products) {
  try {
    console.log('🔄 กำลังสร้างคำสั่งซื้อตัวอย่าง...');
    
    // ลบคำสั่งซื้อเดิมทั้งหมด
    await Order.deleteMany({});
    
    const sampleOrders = [
      {
        userIndex: 1, // John Doe
        items: [
          { productIndex: 0, quantity: 1 }, // iPhone 15 Pro
          { productIndex: 5, quantity: 1 }  // กระเป๋าเป้
        ],
        status: 'delivered',
        paymentStatus: 'completed'
      },
      {
        userIndex: 2, // Jane Smith
        items: [
          { productIndex: 2, quantity: 1 }, // MacBook Air M3
          { productIndex: 4, quantity: 2 }  // หนังสือ Node.js
        ],
        status: 'shipped',
        paymentStatus: 'completed'
      },
      {
        userIndex: 1, // John Doe
        items: [
          { productIndex: 3, quantity: 2 } // เสื้อโปโล
        ],
        status: 'confirmed',
        paymentStatus: 'completed'
      }
    ];
    
    const orders = [];
    
    for (const orderData of sampleOrders) {
      const user = users[orderData.userIndex];
      const orderItems = [];
      let subtotal = 0;
      
      // สร้างรายการสินค้าในคำสั่งซื้อ
      for (const item of orderData.items) {
        const product = products[item.productIndex];
        const unitPrice = product.price;
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        
        orderItems.push({
          product: product._id,
          productSnapshot: {
            name: product.name,
            price: product.price,
            image: product.primaryImage?.url || product.images[0]?.url,
            sku: product.sku
          },
          quantity: item.quantity,
          unitPrice,
          totalPrice
        });
      }
      
      const shippingCost = 50;
      const totalAmount = subtotal + shippingCost;
      
      const order = new Order({
        userId: user._id,
        customerInfo: {
          email: user.email,
          phoneNumber: user.phoneNumber
        },
        items: orderItems,
        subtotal,
        shippingCost,
        totalAmount,
        status: orderData.status,
        shippingAddress: user.addresses[0] || {
          firstName: user.firstName,
          lastName: user.lastName,
          street: '123 ตัวอย่างที่อยู่',
          city: 'กรุงเทพฯ',
          postalCode: '10100',
          country: 'Thailand',
          phoneNumber: user.phoneNumber || '0812345678'
        },
        payment: {
          method: 'credit_card',
          status: orderData.paymentStatus
        },
        shipping: {
          method: 'standard',
          cost: shippingCost,
          status: orderData.status === 'delivered' ? 'delivered' : 'pending'
        }
      });
      
      await order.save();
      orders.push(order);
    }
    
    console.log(`✅ สร้างคำสั่งซื้อ ${orders.length} รายการ:`);
    orders.forEach(order => {
      console.log(`   • ${order.orderNumber} - ${order.totalAmount} บาท (${order.status})`);
    });
    
    return orders;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ:', error.message);
    throw error;
  }
}

/**
 * ฟังก์ชันหลักสำหรับเพิ่มข้อมูลตัวอย่าง
 */
async function seedDatabase() {
  try {
    console.log('🌱 ======================================');
    console.log('🌱 เริ่มเพิ่มข้อมูลตัวอย่างลงฐานข้อมูล');
    console.log('🌱 ======================================');
    
    // เชื่อมต่อฐานข้อมูล
    await database.connect();
    
    // สร้างข้อมูลตัวอย่าง
    const users = await seedUsers();
    const products = await seedProducts(users);
    await seedReviews(users, products);
    const orders = await seedOrders(users, products);
    
    // สรุปผลลัพธ์
    console.log('🎉 ======================================');
    console.log('🎉 เพิ่มข้อมูลตัวอย่างเสร็จสิ้น!');
    console.log('🎉 ======================================');
    console.log(`👥 ผู้ใช้: ${users.length} คน`);
    console.log(`📦 สินค้า: ${products.length} รายการ`);
    console.log(`🛒 คำสั่งซื้อ: ${orders.length} รายการ`);
    console.log('');
    console.log('📋 ข้อมูลสำหรับทดสอบ:');
    console.log('   👑 Admin: admin@example.com / Admin123');
    console.log('   👤 User: john@example.com / Password123');
    console.log('   👤 User: jane@example.com / Password123');
    console.log('   🛡️  Moderator: moderator@example.com / Moderator123');
    console.log('');
    console.log('🚀 ตอนนี้คุณสามารถเริ่มใช้งาน API ได้แล้ว!');
    console.log('🌐 เริ่ม server: npm start');
    
  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาดในการเพิ่มข้อมูล:', error);
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    await database.disconnect();
    process.exit(0);
  }
}

/**
 * ลบข้อมูลทั้งหมดในฐานข้อมูล
 */
async function clearDatabase() {
  try {
    console.log('🗑️  กำลังลบข้อมูลทั้งหมด...');
    
    await database.connect();
    
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    
    console.log('✅ ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการลบข้อมูล:', error);
  } finally {
    await database.disconnect();
    process.exit(0);
  }
}

// รันตามคำสั่ง command line
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'clear':
      clearDatabase();
      break;
    case 'seed':
    default:
      seedDatabase();
      break;
  }
}

module.exports = {
  seedDatabase,
  clearDatabase,
  seedUsers,
  seedProducts,
  seedOrders
};