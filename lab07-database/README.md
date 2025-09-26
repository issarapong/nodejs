# Lab 7: Database Integration 🗄️
## การเชื่อมต่อและจัดการฐานข้อมูล

### 🎯 จุดประสงค์การเรียนรู้
- เข้าใจการเชื่อมต่อฐานข้มูลด้วย Node.js
- การใช้งาน MongoDB และ Mongoose
- การออกแบบ Schema และ Model
- CRUD operations กับฐานข้อมูล
- การจัดการ Connection pooling และ Error handling

### 📚 เนื้อหาที่จะเรียนรู้
1. **MongoDB Setup** - การติดตั้งและการตั้งค่า
2. **Mongoose ODM** - Object Document Mapper
3. **Schema Design** - การออกแบบโครงสร้างข้อมูล
4. **CRUD Operations** - Create, Read, Update, Delete
5. **Database Relationships** - การเชื่อมโยงข้อมูล
6. **Indexing & Performance** - การทำ index และปรับปรุงประสิทธิภาพ
7. **Transactions** - การจัดการธุรกรรม
8. **Data Validation** - การตรวจสอบข้อมูล

### 🛠️ เทคโนโลยีที่ใช้
- **MongoDB** - NoSQL Database
- **Mongoose** - MongoDB ODM
- **Express.js** - Web Framework
- **bcrypt** - Password Hashing
- **jsonwebtoken** - JWT Authentication
- **moment** - Date Management

### 📁 ไฟล์ในแล็บนี้
```
lab07-database/
├── README.md           # คู่มือการใช้งาน
├── package.json        # Dependencies และ scripts
├── app.js             # หลัก Express application
├── config/
│   └── database.js    # การตั้งค่าฐานข้อมูล
├── models/
│   ├── User.js        # User model
│   ├── Product.js     # Product model
│   └── Order.js       # Order model
├── controllers/
│   ├── userController.js    # User CRUD operations
│   ├── productController.js # Product CRUD operations
│   └── orderController.js   # Order CRUD operations
├── routes/
│   ├── users.js       # User routes
│   ├── products.js    # Product routes
│   └── orders.js      # Order routes
├── middleware/
│   ├── auth.js        # Authentication middleware
│   └── validation.js  # Input validation
├── utils/
│   ├── seed.js        # ข้อมูลเริ่มต้น
│   └── helpers.js     # Helper functions
└── data/
    └── sample-data.json # ข้อมูลตัวอย่าง
```

### 🚀 วิธีการรัน

#### 1. ติดตั้ง Dependencies
```bash
cd lab07-database
npm install
```

#### 2. ตั้งค่า MongoDB
```bash
# ตัวเลือก 1: ใช้ MongoDB Atlas (Cloud)
# สร้างบัญชีที่ https://cloud.mongodb.com
# สร้าง cluster และได้ connection string

# ตัวเลือก 2: ใช้ MongoDB Local (หรือ Docker)
# ติดตั้ง MongoDB locally หรือใช้ Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### 3. ตั้งค่าตัวแปรสภาพแวดล้อม
```bash
# สร้างไฟล์ .env
cp .env.example .env

# แก้ไข .env
MONGODB_URI=mongodb://localhost:27017/nodejs-lab
JWT_SECRET=your-secret-key-here
PORT=3000
```

#### 4. เพิ่มข้อมูลเริ่มต้น
```bash
# รันคำสั่งเพื่อเพิ่มข้อมูลตัวอย่าง
npm run seed
```

#### 5. รันแอปพลิเคชัน
```bash
# Development mode
npm run dev

# Production mode  
npm start
```

### 🌐 API Endpoints

#### Users API
```http
GET    /api/users           # ดูรายการผู้ใช้ทั้งหมด
GET    /api/users/:id       # ดูข้อมูลผู้ใช้รายเดียว
POST   /api/users           # สร้างผู้ใช้ใหม่
PUT    /api/users/:id       # แก้ไขข้อมูลผู้ใช้
DELETE /api/users/:id       # ลบผู้ใช้

POST   /api/users/register  # ลงทะเบียนผู้ใช้
POST   /api/users/login     # เข้าสู่ระบบ
```

#### Products API
```http
GET    /api/products        # ดูรายการสินค้าทั้งหมด
GET    /api/products/:id    # ดูข้อมูลสินค้ารายเดียว
POST   /api/products        # สร้างสินค้าใหม่
PUT    /api/products/:id    # แก้ไขข้อมูลสินค้า
DELETE /api/products/:id    # ลบสินค้า

GET    /api/products/search?q=keyword # ค้นหาสินค้า
GET    /api/products/category/:cat    # ดูสินค้าตามหมวดหมู่
```

#### Orders API
```http
GET    /api/orders          # ดูรายการคำสั่งซื้อทั้งหมด
GET    /api/orders/:id      # ดูข้อมูลคำสั่งซื้อรายเดียว
POST   /api/orders          # สร้างคำสั่งซื้อใหม่
PUT    /api/orders/:id      # แก้ไขสถานะคำสั่งซื้อ
DELETE /api/orders/:id      # ยกเลิกคำสั่งซื้อ

GET    /api/orders/user/:userId # ดูคำสั่งซื้อของผู้ใช้รายเดียว
```

### 📋 ตัวอย่างการใช้งาน

#### สร้างผู้ใช้ใหม่
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### เข้าสู่ระบบ
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### สร้างสินค้าใหม่ (ต้อง Login ก่อน)
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "iPhone 15 Pro",
    "description": "มือถือรุ่นล่าสุดจาก Apple",
    "price": 39900,
    "category": "electronics",
    "stock": 10,
    "images": ["iphone15pro.jpg"]
  }'
```

#### สร้างคำสั่งซื้อ
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "items": [
      {
        "product": "PRODUCT_ID_HERE",
        "quantity": 2,
        "price": 39900
      }
    ],
    "shippingAddress": {
      "street": "123 หมู่ 1",
      "city": "กรุงเทพฯ",
      "postalCode": "10100",
      "country": "Thailand"
    }
  }'
```

### 🔍 Advanced Features

#### 1. Aggregation Pipeline
```javascript
// ดูสถิติการขายตามหมวดหมู่
GET /api/products/stats/category

// ดูรายงานการขายรายเดือน
GET /api/orders/stats/monthly
```

#### 2. Text Search
```javascript
// ค้นหาสินค้าด้วย text search
GET /api/products/search?q=iPhone&sort=price&order=desc
```

#### 3. Pagination
```javascript
// แบ่งหน้าข้อมูล
GET /api/products?page=2&limit=10
```

### 🧪 การทดสอบ

```bash
# ทดสอบการเชื่อมต่อฐานข้อมูล
npm run test:db

# ทดสอบ API endpoints
npm run test:api

# ทดสอบทั้งหมด
npm test
```

### 📈 Performance Tips

1. **Indexing**: สร้าง index สำหรับฟิลด์ที่ค้นหาบ่อย
2. **Connection Pooling**: ใช้ connection pool เพื่อจัดการ connections
3. **Caching**: Cache ข้อมูลที่ไม่เปลี่ยนแปลงบ่อย
4. **Pagination**: ใช้ pagination สำหรับข้อมูลจำนวนมาก
5. **Aggregation**: ใช้ aggregation pipeline แทนการ query หลายครั้ง

### 🚨 Security Considerations

1. **Input Validation**: ตรวจสอบข้อมูลก่อนบันทึก
2. **Password Hashing**: เข้ารหัสรหัสผ่านด้วย bcrypt
3. **JWT Security**: ใช้ JWT อย่างปลอดภัย
4. **Rate Limiting**: จำกัดจำนวนคำขอต่อนาที
5. **SQL Injection Prevention**: ป้องกัน NoSQL injection

### 🎓 สิ่งที่จะได้เรียนรู้

✅ การเชื่อมต่อและกำหนดค่า MongoDB  
✅ การใช้งาน Mongoose ODM  
✅ การออกแบบ Schema และ Relationships  
✅ CRUD operations แบบ Asynchronous  
✅ Authentication และ Authorization  
✅ Data Validation และ Error Handling  
✅ Database Performance Optimization  
✅ Real-world API Development Patterns  

### 📚 Resources เพิ่มเติม

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Guide](https://mongoosejs.com/docs/guide.html)
- [MongoDB University](https://university.mongodb.com/)
- [Node.js & MongoDB Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**หมายเหตุ:** Lab นี้ต้องการ MongoDB ที่ทำงานอยู่ ให้ติดตั้งหรือใช้ MongoDB Atlas ก่อนรัน