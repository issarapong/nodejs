# Lab 6: Middleware และ Advanced Routing

## 🎯 จุดประสงค์การเรียนรู้
- เรียนรู้แนวคิด Middleware แบบลึก
- สร้าง custom middleware functions
- รู้จักกับ built-in middleware ของ Express
- เรียนรู้ advanced routing techniques
- Error handling middleware

## 📖 ทฤษฎี

### Middleware คืออะไร?
Middleware คือฟังก์ชันที่ทำงานระหว่าง HTTP request และ response โดยมีการเข้าถึง:
- `req` (request object)
- `res` (response object)  
- `next` (function เพื่อไปยัง middleware ตัวถัดไป)

### ประเภทของ Middleware:
1. **Application-level**: ใช้กับทั้ง app
2. **Router-level**: ใช้กับ router เฉพาะ
3. **Error-handling**: จัดการ errors
4. **Built-in**: middleware ที่มาพร้อม Express
5. **Third-party**: middleware จากภายนอก

### การทำงานของ Middleware:
```
Request → Middleware 1 → Middleware 2 → Route Handler → Response
```

## 🛠️ การทำ Lab

### วิธีการรัน

```bash
npm install
npm start

# หรือรันแยกไฟล์
node app.js
node custom-middleware.js
node routing-advanced.js
```

## 📁 ไฟล์ใน Lab นี้

- `app.js` - Express app พร้อม middleware หลัก
- `middleware/` - โฟลเดอร์ custom middleware
- `routes/` - โฟลเดอร์ route handlers
- `custom-middleware.js` - ตัวอย่าง custom middleware
- `routing-advanced.js` - advanced routing

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจากทำ lab นี้เสร็จ คุณจะ:
- เข้าใจแนวคิด middleware
- สร้าง custom middleware ได้
- ใช้งาน error handling middleware
- จัดการ routing แบบซับซ้อน