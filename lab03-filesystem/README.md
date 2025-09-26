# Lab 3: File System Operations

## 🎯 จุดประสงค์การเรียนรู้
- เรียนรู้การทำงานกับระบบไฟล์ใน Node.js
- เข้าใจความแตกต่างระหว่าง Synchronous และ Asynchronous file operations
- รู้จักกับ Streams และการจัดการไฟล์ขนาดใหญ่
- เรียนรู้การจัดการ directories และ file permissions

## 📖 ทฤษฎี

### File System Module (fs)
Node.js มี built-in module ชื่อ `fs` สำหรับทำงานกับระบบไฟล์

### การทำงาน 2 แบบ:
1. **Synchronous (Blocking)**: จะรอจนกว่าจะเสร็จก่อนไปทำงานต่อ
   - `fs.readFileSync()`, `fs.writeFileSync()`
   - ใช้เมื่อต้องการความแน่นอนในลำดับการทำงาน

2. **Asynchronous (Non-blocking)**: ไม่รอ จะทำงานอื่นต่อไปได้
   - `fs.readFile()`, `fs.writeFile()` (callback)
   - `fs.promises.readFile()`, `fs.promises.writeFile()` (promise)
   - ใช้สำหรับ production เพื่อประสิทธิภาพ

### Streams
สำหรับจัดการไฟล์ขนาดใหญ่โดยไม่ต้องโหลดทั้งไฟล์เข้า memory

## 🛠️ การทำ Lab

### วิธีการรัน

```bash
# รันไฟล์หลัก
npm run lab03

# หรือรันแยกไฟล์
node app.js
node sync-async.js
node streams.js
node directory-ops.js
node file-watcher.js
```

## 📁 ไฟล์ใน Lab นี้

- `app.js` - ไฟล์หลักสาธิต File System
- `sync-async.js` - เปรียบเทียบ sync vs async
- `streams.js` - การใช้งาน Streams
- `directory-ops.js` - การจัดการไดเรกทอรี
- `file-watcher.js` - การ watch การเปลี่ยนแปลงไฟล์
- `data/` - โฟลเดอร์เก็บไฟล์ข้อมูลทดสอบ

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจากทำ lab นี้เสร็จ คุณจะ:
- สามารถอ่าน เขียน และจัดการไฟล์
- เข้าใจความแตกต่าง sync vs async operations
- รู้จักการใช้งาน Streams สำหรับไฟล์ขนาดใหญ่
- สามารถจัดการไดเรกทอรีและ file permissions