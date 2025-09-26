// globals.js - การทำงานกับ Global Objects ใน Node.js

console.log('=== Global Objects ใน Node.js ===\n');

// 1. __dirname และ __filename
console.log('1. Path และ File Information:');
console.log('โฟลเดอร์ปัจจุบัน (__dirname):', __dirname);
console.log('ไฟล์ปัจจุบัน (__filename):', __filename);
console.log();

// 2. process object
console.log('2. Process Object:');
console.log('Node.js เวอร์ชั่น:', process.version);
console.log('แพลตฟอร์ม:', process.platform);
console.log('Architecture:', process.arch);
console.log('PID (Process ID):', process.pid);
console.log('Current Working Directory:', process.cwd());
console.log('Node.js Executable Path:', process.execPath);
console.log();

// 3. Environment Variables
console.log('3. Environment Variables:');
console.log('PATH:', process.env.PATH ? 'มี PATH ในระบบ' : 'ไม่มี PATH');
console.log('HOME/USERPROFILE:', process.env.HOME || process.env.USERPROFILE);

// ตั้งค่า environment variable
process.env.MY_APP_NAME = 'Node.js Lab';
console.log('ชื่อแอปของเรา:', process.env.MY_APP_NAME);
console.log();

// 4. Command Line Arguments
console.log('4. Command Line Arguments:');
console.log('process.argv:', process.argv);

// ตัวอย่างการ parse arguments
const args = process.argv.slice(2); // เอาแค่ arguments ที่ผู้ใช้ส่งมา
if (args.length > 0) {
    console.log('Arguments ที่ส่งมา:', args);
    args.forEach((arg, index) => {
        console.log(`  Argument ${index + 1}: ${arg}`);
    });
} else {
    console.log('ไม่มี arguments ส่งมา');
    console.log('ลองรัน: node globals.js hello world 123');
}
console.log();

// 5. Memory Usage
console.log('5. Memory Usage:');
const memoryUsage = process.memoryUsage();
console.log('RSS (Resident Set Size):', Math.round(memoryUsage.rss / 1024 / 1024), 'MB');
console.log('Heap Total:', Math.round(memoryUsage.heapTotal / 1024 / 1024), 'MB');
console.log('Heap Used:', Math.round(memoryUsage.heapUsed / 1024 / 1024), 'MB');
console.log('External:', Math.round(memoryUsage.external / 1024 / 1024), 'MB');
console.log();

// 6. Performance Timing
console.log('6. Performance Timing:');
const startTime = process.hrtime();

// จำลองการทำงานที่ใช้เวลา
let sum = 0;
for (let i = 0; i < 1000000; i++) {
    sum += i;
}

const diff = process.hrtime(startTime);
console.log(`การคำนวณใช้เวลา: ${diff[0]}s ${diff[1] / 1000000}ms`);
console.log('ผลรวม:', sum);
console.log();

// 7. Global Functions
console.log('7. Global Functions:');
console.log('setTimeout และ setInterval เป็น global functions');

let counter = 0;
const intervalId = setInterval(() => {
    counter++;
    console.log(`Counter: ${counter}`);
    
    if (counter >= 3) {
        clearInterval(intervalId);
        console.log('หยุด interval แล้ว');
    }
}, 1000);

console.log('=== จบการแสดง Global Objects ===');