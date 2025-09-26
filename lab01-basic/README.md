# Lab 1: การติดตั้งและการใช้งาน Node.js เบื้องต้น

## 🎯 จุดประสงค์การเรียนรู้
- เข้าใจพื้นฐาน Node.js และ JavaScript runtime
- รู้จักกับ Global Objects และ Process ใน Node.js
- เรียนรู้การใช้งาน console และ debugging พื้นฐาน
- ทำความเข้าใจ Event Loop และ Asynchronous Programming

## 📖 ทฤษฎี

### Node.js คืออะไร?
Node.js เป็น JavaScript runtime ที่ถูกสร้างขึ้นบน V8 JavaScript engine ของ Google Chrome ทำให้สามารถรัน JavaScript บน server-side ได้

### จุดเด่นของ Node.js:
1. **Non-blocking I/O**: ไม่บล็อก thread เมื่อทำ I/O operations
2. **Event-driven**: ใช้ Event Loop ในการจัดการ events
3. **Single-threaded**: แต่มีประสิทธิภาพสูงเพราะใช้ Event Loop
4. **NPM**: Package manager ที่ใหญ่ที่สุดในโลก

## 🛠️ การทำ Lab

### 1. ตรวจสอบการติดตั้ง Node.js

```bash
node --version
npm --version
```

### 2. รันไฟล์แรก
```bash
node app.js
```

### 3. ทดลองกับ REPL
```bash
node
```

## 📁 ไฟล์ใน Lab นี้

- `app.js` - ไฟล์หลักสำหรับทดสอบ Node.js พื้นฐาน
- `globals.js` - ตัวอย่างการใช้งาน Global Objects
- `process.js` - การทำงานกับ Process object
- `async-example.js` - ตัวอย่าง Asynchronous Programming
- `event-loop.js` - ทำความเข้าใจ Event Loop

## 🚀 วิธีการรัน

```bash
# รันไฟล์หลัก
npm run lab01

# หรือรันแยกไฟล์
node app.js
node globals.js
node process.js
node async-example.js
node event-loop.js
```

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจากทำ lab นี้เสร็จ คุณจะ:
- รู้จักกับ Node.js runtime environment
- เข้าใจ Global objects พื้นฐาน
- สามารถใช้ console สำหรับ debugging
- เข้าใจพื้นฐาน Asynchronous programming