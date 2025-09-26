// process.js - การทำงานกับ Process Object

console.log('=== การทำงานกับ Process Object ===\n');

// 1. Process Information
console.log('1. ข้อมูล Process:');
console.log('Process ID (PID):', process.pid);
console.log('Parent Process ID (PPID):', process.ppid);
console.log('Node.js Version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Uptime:', process.uptime(), 'วินาที');
console.log();

// 2. Process Arguments
console.log('2. Process Arguments:');
console.log('Executable:', process.argv0);
console.log('Node Path:', process.argv[0]);
console.log('Script Path:', process.argv[1]);
console.log('Arguments:', process.argv.slice(2));

// ตัวอย่างการใช้ arguments
if (process.argv.length > 2) {
    console.log('คุณส่ง arguments มา:');
    process.argv.slice(2).forEach((arg, index) => {
        console.log(`  ${index + 1}: ${arg}`);
    });
} else {
    console.log('ไม่มี arguments');
    console.log('ลองรัน: node process.js --name="สมชาย" --age=25');
}
console.log();

// 3. Environment Variables
console.log('3. Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'ไม่ได้กำหนด');
console.log('PWD:', process.env.PWD || process.cwd());

// ตั้งค่า environment variables
process.env.APP_NAME = 'Node.js Process Lab';
process.env.VERSION = '1.0.0';
console.log('App Name:', process.env.APP_NAME);
console.log('Version:', process.env.VERSION);
console.log();

// 4. Working Directory
console.log('4. Working Directory:');
console.log('Current Directory:', process.cwd());

try {
    const originalDir = process.cwd();
    console.log('เปลี่ยนไปยังไดเรกทอรีแม่...');
    process.chdir('..');
    console.log('ไดเรกทอรีใหม่:', process.cwd());
    
    // เปลี่ยนกลับ
    process.chdir(originalDir);
    console.log('เปลี่ยนกลับไปยังไดเรกทอรีเดิม:', process.cwd());
} catch (error) {
    console.log('Error changing directory:', error.message);
}
console.log();

// 5. Process Events
console.log('5. Process Events:');

// Event: exit
process.on('exit', (code) => {
    console.log(`\nProcess จะปิดด้วย exit code: ${code}`);
});

// Event: uncaughtException
process.on('uncaughtException', (error) => {
    console.log('Uncaught Exception:', error.message);
    // ในสถานการณ์จริง ควร log error และปิดโปรแกรม
});

// Event: unhandledRejection
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 6. Process Signals (สำหรับ Unix/Linux)
if (process.platform !== 'win32') {
    console.log('6. Process Signals (Unix/Linux only):');
    
    process.on('SIGTERM', () => {
        console.log('ได้รับ SIGTERM signal - จะปิดโปรแกรม');
        process.exit(0);
    });
    
    process.on('SIGINT', () => {
        console.log('\nได้รับ SIGINT signal (Ctrl+C) - จะปิดโปรแกรม');
        process.exit(0);
    });
    
    console.log('ลอง Ctrl+C เพื่อทดสอบ SIGINT signal');
}

// 7. Memory และ CPU Usage
console.log('7. Resource Usage:');

function showMemoryUsage() {
    const usage = process.memoryUsage();
    console.log('Memory Usage:');
    console.log(`  RSS: ${Math.round(usage.rss / 1024 / 1024)} MB`);
    console.log(`  Heap Total: ${Math.round(usage.heapTotal / 1024 / 1024)} MB`);
    console.log(`  Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)} MB`);
    console.log(`  External: ${Math.round(usage.external / 1024 / 1024)} MB`);
}

showMemoryUsage();

// CPU Usage (ถ้ามี)
if (process.cpuUsage) {
    const startUsage = process.cpuUsage();
    
    // จำลองการทำงานที่ใช้ CPU
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
        sum += Math.random();
    }
    
    const cpuUsage = process.cpuUsage(startUsage);
    console.log('CPU Usage:');
    console.log(`  User: ${cpuUsage.user / 1000} ms`);
    console.log(`  System: ${cpuUsage.system / 1000} ms`);
}

console.log();
console.log('=== จบการทำงานกับ Process Object ===');

// 8. Process Exit
setTimeout(() => {
    console.log('\nโปรแกรมจะปิดใน 3 วินาที...');
    setTimeout(() => {
        process.exit(0);
    }, 3000);
}, 1000);