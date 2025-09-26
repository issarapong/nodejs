# Lab 4: HTTP Server พื้นฐาน

## 🎯 จุดประสงค์การเรียนรู้
- เรียนรู้การสร้าง HTTP Server ด้วย Node.js
- เข้าใจ HTTP protocol (Request/Response)
- รู้จักการจัดการ routing พื้นฐาน
- เรียนรู้การทำงานกับ HTTP methods และ headers

## 📖 ทฤษฎี

### HTTP Server ใน Node.js
Node.js มี built-in module `http` สำหรับสร้าง web server

### องค์ประกอบสำคัญ:
1. **Request Object (req)**: ข้อมูลที่ client ส่งมา
2. **Response Object (res)**: ข้อมูลที่เราจะส่งกลับไป
3. **Routing**: การกำหนดว่า URL ไหนจะทำอะไร
4. **HTTP Methods**: GET, POST, PUT, DELETE, etc.

### HTTP Status Codes:
- 200: OK
- 404: Not Found
- 500: Internal Server Error
- 301/302: Redirect

## 🛠️ การทำ Lab

### วิธีการรัน

```bash
# รันเซิร์ฟเวอร์หลัก
node server.js

# รันตัวอย่างต่าง ๆ
node basic-server.js
node routing-server.js
node json-api.js
node static-files.js
```

### ทดสอบ Server
เปิดเบราว์เซอร์ไปที่:
- http://localhost:3000/
- http://localhost:3000/about
- http://localhost:3000/api/users
- http://localhost:3000/static/

## 📁 ไฟล์ใน Lab นี้

- `server.js` - HTTP server หลัก
- `basic-server.js` - เซิร์ฟเวอร์พื้นฐาน
- `routing-server.js` - เซิร์ฟเวอร์ที่มี routing
- `json-api.js` - API ที่ส่ง JSON
- `static-files.js` - เสิร์ฟไฟล์ static
- `public/` - โฟลเดอร์เก็บไฟล์ static

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจากทำ lab นี้เสร็จ คุณจะ:
- สามารถสร้าง HTTP server พื้นฐาน
- เข้าใจการทำงานของ Request/Response
- รู้จักการจัดการ routing
- สามารถสร้าง API ที่ส่ง JSON