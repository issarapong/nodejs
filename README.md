# Node.js Lab - การเรียนรู้ Node.js จากพื้นฐานสู่ขั้นสูง

## 📚 เนื้อหาการเรียนรู้

### ✅ พื้นฐาน Node.js (Basic) - เสร็จสิ้นแล้ว
- [Lab 1: การติดตั้งและการใช้งาน Node.js เบื้องต้น](./lab01-basic/) ✅
- [Lab 2: Node.js Modules และ NPM](./lab02-modules/) ✅
- [Lab 3: File System Operations](./lab03-filesystem/) ✅
- [Lab 4: HTTP Server พื้นฐาน](./lab04-http-server/) ✅

### ✅ ระดับกลาง (Intermediate) - เสร็จสิ้นแล้ว
- [Lab 5: Express.js Framework](./lab05-express/) ✅
- [Lab 6: Middleware และ Advanced Routing](./lab06-middleware/) ✅

### 🚧 ระดับสูง (Advanced) - กำลังพัฒนา
- [Lab 7: Database Integration (MongoDB)](./lab07-database/) 🚧
- [Lab 8: RESTful API](./lab08-restful-api/) 🚧
- [Lab 9: Authentication & Authorization](./lab09-auth/) 🚧
- [Lab 10: WebSocket และ Real-time Communication](./lab10-websocket/) 🚧
- [Lab 11: Testing และ TDD](./lab11-testing/) 🚧
- [Lab 12: Microservices Architecture](./lab12-microservices/) 🚧
- [Lab 13: Performance Optimization](./lab13-performance/) 🚧
- [Lab 14: Docker และ Containerization](./lab14-docker/) 🚧

## 🚀 การเริ่มต้น

1. ตรวจสอบการติดตั้ง Node.js:
```bash
node --version
npm --version
```

2. Clone หรือดาวน์โหลดโปรเจคนี้

3. ไปยัง lab ที่ต้องการและติดตั้ง dependencies:
```bash
cd lab01-basic
# ไม่ต้องติดตั้งอะไรเพิ่ม

cd lab02-modules
npm install

cd lab05-express  
npm install

cd lab06-middleware
npm install
```

4. รันแต่ละ lab ตามคำแนะนำใน README ของแต่ละ lab

## 📋 สิ่งที่ต้องมี (Prerequisites)

- Node.js (version 16 หรือใหม่กว่า)
- npm หรือ yarn
- Text Editor (VS Code แนะนำ)
- Terminal หรือ Command Prompt
- เบราว์เซอร์สำหรับทดสอบ web applications

## 🎯 สิ่งที่ได้เรียนรู้จาก Labs ที่เสร็จแล้ว

### Lab 1: Node.js พื้นฐาน ✅
- การทำงานของ Node.js runtime
- Global objects และ Process object
- Asynchronous programming (Promises, async/await)
- Event Loop และการทำงานแบบ non-blocking

### Lab 2: Modules และ NPM ✅  
- ระบบ Module ใน Node.js (CommonJS vs ES Modules)
- การสร้างและใช้งาน custom modules
- การจัดการ packages ด้วย NPM
- การใช้งาน third-party libraries

### Lab 3: File System ✅
- การอ่าน เขียน และจัดการไฟล์
- Synchronous vs Asynchronous file operations
- การทำงานกับ JSON, CSV และไฟล์ต่าง ๆ
- File statistics และ directory operations

### Lab 4: HTTP Server ✅
- การสร้าง HTTP Server พื้นฐาน
- Request/Response handling
- Basic routing และ HTTP methods
- การเสิร์ฟไฟล์ static

### Lab 5: Express.js Framework ✅
- Express.js framework พื้นฐาน
- Middleware concept
- RESTful API development
- Error handling และ routing

### Lab 6: Advanced Middleware ✅
- Custom middleware development
- Authentication และ authorization
- Input validation middleware
- Logging และ performance monitoring
- Rate limiting และ security

## �‍♂️ วิธีการรัน Labs

```bash
# Lab 1: Node.js พื้นฐาน
cd lab01-basic
node app.js
node globals.js
node process.js
node async-example.js
node event-loop.js

# Lab 2: Modules และ NPM
cd lab02-modules
npm install
node app.js
node commonjs-example.js
node esm-example.mjs
node npm-demo.js

# Lab 3: File System
cd lab03-filesystem  
node app.js

# Lab 4: HTTP Server
cd lab04-http-server
node server.js
# เปิด http://localhost:3000

# Lab 5: Express.js
cd lab05-express
npm install
node app.js
# เปิด http://localhost:3000

# Lab 6: Middleware
cd lab06-middleware
npm install  
node app.js
# เปิด http://localhost:3000
```

## 📊 ความคืบหน้า

- ✅ **6 Labs เสร็จสิ้นแล้ว** - พื้นฐานถึงระดับกลาง
- 🚧 **8 Labs กำลังพัฒนา** - ระดับสูงและ advanced topics
- 📈 **43% เสร็จสิ้น** จากทั้งหมด 14 Labs

## 🎓 เป้าหมายการเรียนรู้

หลังจากทำ labs ทั้งหมดเสร็จแล้ว คุณจะสามารถ:
- ✅ เข้าใจหลักการทำงานของ Node.js
- ✅ สร้าง web application ด้วย Express.js  
- ✅ ออกแบบและพัฒนา RESTful API
- ✅ จัดการ middleware และ authentication
- 🚧 จัดการฐานข้อมูล MongoDB
- 🚧 ทำ Authentication และ Authorization แบบสมบูรณ์
- 🚧 สร้าง real-time application ด้วย WebSocket
- 🚧 เขียน test และใช้ TDD
- 🚧 สร้างและจัดการ microservices
- 🚧 ปรับปรุงประสิทธิภาพของแอปพลิเคชัน
- 🚧 ใช้ Docker สำหรับ containerization

## 📚 แหล่งเรียนรู้เพิ่มเติม

- [Node.js Official Documentation](https://nodejs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [NPM Documentation](https://docs.npmjs.com/)
- [MDN JavaScript Guide](https://developer.mozilla.org/docs/Web/JavaScript)

## 🤝 การสนับสนุน

หากมีคำถามหรือต้องการความช่วยเหลือ:
- ดู README.md ในแต่ละ lab folder
- ดู [LAB-SUMMARY.md](./LAB-SUMMARY.md) สำหรับข้อมูลโดยละเอียด
- ทดลองรันโค้ดและปรับแต่งตามต้องการ

---
**สร้างโดย:** Node.js Lab Series  
**ภาษา:** ไทย  
**สถานะ:** 📈 6/14 Labs เสร็จสิ้น (43%)  
**อัพเดทล่าสุด:** กันยายน 2025