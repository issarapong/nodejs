# Lab 5: Express.js Framework

## 🎯 จุดประสงค์การเรียนรู้
- เรียนรู้การใช้งาน Express.js framework
- เข้าใจ middleware concept
- รู้จักการทำ routing และ parameter handling
- เรียนรู้การสร้าง RESTful API ด้วย Express

## 📖 ทฤษฎี

### Express.js คืออะไร?
Express.js เป็น web application framework สำหรับ Node.js ที่มีความยืดหยุ่นและมี features ครบครัน

### ความสามารถหลัก:
1. **Routing**: จัดการ URL paths
2. **Middleware**: ฟังก์ชันที่ทำงานระหว่าง request/response
3. **Template Engine**: สำหรับ rendering HTML
4. **Static Files**: เสิร์ฟไฟล์ static
5. **Error Handling**: จัดการ errors

### Middleware คืออะไร?
ฟังก์ชันที่อยู่ระหว่าง request และ response ที่สามารถ:
- ปรับแต่ง request/response objects
- จบ request-response cycle
- เรียก middleware ตัวถัดไป

## 🛠️ การทำ Lab

### ติดตั้ง Dependencies

```bash
npm install express cors helmet morgan
npm install --save-dev nodemon
```

### วิธีการรัน

```bash
# รันด้วย nodemon (auto-reload)
npm run dev

# รันแบบปกติ
npm start

# รันตัวอย่างแยก
node basic-express.js
node middleware-demo.js
node routing-demo.js
```

## 📁 ไฟล์ใน Lab นี้

- `app.js` - Express application หลัก
- `basic-express.js` - Express พื้นฐาน
- `middleware-demo.js` - ตัวอย่าง middleware
- `routing-demo.js` - ตัวอย่าง routing
- `routes/` - โฟลเดอร์เก็บ route files
- `public/` - โฟลเดอร์ static files
- `views/` - โฟลเดอร์ templates

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจากทำ lab นี้เสร็จ คุณจะ:
- สามารถใช้งาน Express.js พื้นฐาน
- เข้าใจแนวคิด middleware
- สร้าง routing ที่ซับซ้อนได้
- รู้จักการจัดการ errors