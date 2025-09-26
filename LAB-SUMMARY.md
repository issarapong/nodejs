# 📚 Node.js Lab Series - สรุปภาพรวม

## 🎯 Labs ที่สร้างเสร็จแล้ว

### ✅ Lab 1: การใช้งาน Node.js เบื้องต้น (`/lab01-basic`)
**สิ่งที่ได้เรียนรู้:**
- พื้นฐาน Node.js และ JavaScript runtime
- Global Objects และ Process object
- Asynchronous Programming (callbacks, promises, async/await)
- Event Loop และการทำงานของ Node.js

**ไฟล์สำคัญ:**
- `app.js` - ตัวอย่างพื้นฐาน Node.js
- `globals.js` - การใช้งาน Global objects
- `process.js` - การทำงานกับ Process object
- `async-example.js` - ตัวอย่าง Asynchronous programming
- `event-loop.js` - ทำความเข้าใจ Event Loop

### ✅ Lab 2: Node.js Modules และ NPM (`/lab02-modules`)
**สิ่งที่ได้เรียนรู้:**
- ระบบ Module ใน Node.js (CommonJS และ ES Modules)
- การสร้างและใช้งาน custom modules
- การจัดการ package ด้วย NPM
- การใช้งาน third-party libraries

**ไฟล์สำคัญ:**
- `app.js` - การใช้งาน modules หลัก
- `modules/` - โฟลเดอร์เก็บ custom modules
  - `math.js` - โมดูลคำนวณ
  - `string-utils.js` - โมดูลจัดการ string
  - `user.js` - โมดูลจัดการข้อมูลผู้ใช้
- `commonjs-example.js` - ตัวอย่าง CommonJS
- `esm-example.mjs` - ตัวอย่าง ES Modules
- `npm-demo.js` - การใช้งาน NPM packages

### ✅ Lab 3: File System Operations (`/lab03-filesystem`)
**สิ่งที่ได้เรียนรู้:**
- การอ่าน เขียน และจัดการไฟล์
- Synchronous vs Asynchronous operations
- การทำงานกับ JSON, CSV และไฟล์ต่าง ๆ
- File stats และ directory operations

**ไฟล์สำคัญ:**
- `app.js` - การทำงานกับไฟล์หลัก
- `data/` - โฟลเดอร์เก็บไฟล์ตัวอย่าง
- ตัวอย่างไฟล์: `sample.txt`, `users.json`, `users.csv`

### ✅ Lab 4: HTTP Server พื้นฐาน (`/lab04-http-server`)
**สิ่งที่ได้เรียนรู้:**
- การสร้าง HTTP Server ด้วย Node.js
- Request/Response handling
- Routing และ HTTP methods
- การเสิร์ฟไฟล์ static

**ไฟล์สำคัญ:**
- `server.js` - HTTP server หลัก
- `public/` - โฟลเดอร์ไฟล์ static
- HTML pages และ demo files

### ✅ Lab 5: Express.js Framework (`/lab05-express`)
**สิ่งที่ได้เรียนรู้:**
- Express.js framework พื้นฐาน
- Middleware concept
- Advanced routing
- RESTful API development
- Error handling

**ไฟล์สำคัญ:**
- `app.js` - Express application หลัก
- Package.json กับ dependencies
- API endpoints สำหรับ CRUD operations

## 🚧 Labs ที่อยู่ระหว่างการพัฒนา

### Lab 6: Middleware และ Routing
### Lab 7: Database Integration (MongoDB)
### Lab 8: RESTful API
### Lab 9: Authentication & Authorization
### Lab 10: WebSocket และ Real-time Communication
### Lab 11: Testing และ TDD
### Lab 12: Microservices Architecture
### Lab 13: Performance Optimization
### Lab 14: Docker และ Containerization

## 🏃‍♂️ วิธีการรัน Labs

### Lab 1 (Basic Node.js)
```bash
cd lab01-basic
node app.js
node globals.js
node process.js
node async-example.js
node event-loop.js
```

### Lab 2 (Modules)
```bash
cd lab02-modules
npm install
node app.js
node commonjs-example.js
node esm-example.mjs
node npm-demo.js
```

### Lab 3 (File System)
```bash
cd lab03-filesystem
node app.js
```

### Lab 4 (HTTP Server)
```bash
cd lab04-http-server
node server.js
# เปิดเบราว์เซอร์ไปที่ http://localhost:3000
```

### Lab 5 (Express.js)
```bash
cd lab05-express
npm install
node app.js
# หรือ npm run dev (สำหรับ auto-reload)
```

## 📊 สรุปผลการเรียนรู้

### 🎓 หลังจากทำ Labs เหล่านี้แล้ว คุณจะสามารถ:

1. **พื้นฐาน Node.js**
   - เข้าใจ JavaScript runtime และ Event Loop
   - ใช้งาน asynchronous programming
   - จัดการ process และ global objects

2. **Module System**
   - สร้างและใช้งาน modules
   - จัดการ dependencies ด้วย NPM
   - เข้าใจ CommonJS และ ES Modules

3. **File System**
   - อ่าน เขียน และจัดการไฟล์
   - ทำงานกับ JSON และ CSV
   - จัดการ directories

4. **Web Development**
   - สร้าง HTTP server
   - ใช้งาน Express.js framework
   - สร้าง RESTful API
   - จัดการ middleware

## 🔄 การพัฒนาต่อ

Labs เหล่านี้เป็นเพียงจุดเริ่มต้น สิ่งที่ควรเรียนรู้ต่อ:

1. **Database Integration** - MongoDB, MySQL, PostgreSQL
2. **Authentication** - JWT, OAuth, Sessions
3. **Testing** - Jest, Mocha, Supertest
4. **Deployment** - Docker, AWS, Heroku
5. **Advanced Topics** - Microservices, GraphQL, WebSockets

## 📚 แหล่งเรียนรู้เพิ่มเติม

- [Node.js Official Documentation](https://nodejs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [NPM Documentation](https://docs.npmjs.com/)
- [MDN JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

**สร้างโดย:** Node.js Lab Series  
**วัตถุประสงค์:** การเรียนรู้ Node.js จากพื้นฐานสู่ขั้นสูง  
**ภาษา:** ไทย  
**สถานะ:** ✅ 5 Labs เสร็จสิ้น, 🚧 9 Labs กำลังพัฒนา