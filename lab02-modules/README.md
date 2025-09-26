# Lab 2: Node.js Modules และ NPM

## 🎯 จุดประสงค์การเรียนรู้
- เข้าใจระบบ Module ใน Node.js (CommonJS และ ES Modules)
- รู้จักกับ NPM และการจัดการ package
- สร้างและใช้งาน custom modules
- เรียนรู้การ import/export และ module resolution

## 📖 ทฤษฎี

### Module System คืออะไร?
Module system ช่วยให้เราสามารถแยกโค้ดออกเป็นไฟล์ย่อย ๆ และนำมาใช้งานร่วมกันได้

### ประเภทของ Modules:
1. **Core Modules**: มาพร้อมกับ Node.js (fs, path, http, etc.)
2. **Local Modules**: โมดูลที่เราสร้างเอง
3. **Third-party Modules**: โมดูลจาก NPM

### CommonJS vs ES Modules:
- **CommonJS**: require() และ module.exports (รูปแบบเดิม)
- **ES Modules**: import และ export (มาตรฐาน ES6)

## 🛠️ การทำ Lab

### วิธีการรัน

```bash
# รันไฟล์หลัก
npm run lab02

# หรือรันแยกไฟล์
node app.js
node commonjs-example.js
node esm-example.mjs
node npm-demo.js
```

## 📁 ไฟล์ใน Lab นี้

- `app.js` - ไฟล์หลักสาธิต modules
- `modules/` - โฟลเดอร์เก็บ custom modules
  - `math.js` - โมดูลคำนวณ (CommonJS)
  - `string-utils.js` - โมดูลจัดการ string
  - `user.js` - โมดูลจัดการ user data
- `commonjs-example.js` - ตัวอย่าง CommonJS
- `esm-example.mjs` - ตัวอย่าง ES Modules
- `npm-demo.js` - ตัวอย่างการใช้งาน NPM packages
- `package.json` - ไฟล์กำหนดค่าโปรเจค

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจากทำ lab นี้เสร็จ คุณจะ:
- สามารถสร้างและใช้งาน modules
- เข้าใจความแตกต่างระหว่าง CommonJS และ ES Modules
- รู้จักการใช้งาน NPM packages
- สามารถจัดการ dependencies ในโปรเจค