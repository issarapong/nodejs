// app.js - Lab 2: การใช้งาน Node.js Modules

console.log('=== Lab 2: Node.js Modules และ NPM ===\n');

// 1. การใช้งาน Core Modules (โมดูลในตัว)
console.log('1. Core Modules:');

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('ระบบปฏิบัติการ:', os.type());
console.log('โฮสต์เนม:', os.hostname());
console.log('จำนวน CPU:', os.cpus().length);
console.log('Memory ว่าง:', Math.round(os.freemem() / 1024 / 1024), 'MB');
console.log('Path separator:', path.sep);
console.log('Current directory:', path.basename(__dirname));
console.log();

// 2. การใช้งาน Local Modules (โมดูลที่เราสร้าง)
console.log('2. Local Modules:');

// นำเข้า math module
const math = require('./modules/math');

console.log('การคำนวณด้วย math module:');
console.log('5 + 3 =', math.add(5, 3));
console.log('10 - 4 =', math.subtract(10, 4));
console.log('6 × 7 =', math.multiply(6, 7));
console.log('15 ÷ 3 =', math.divide(15, 3));

const numbers = [1, 2, 3, 4, 5];
console.log('ค่าเฉลี่ยของ', numbers, '=', math.average(numbers));
console.log('ค่าสูงสุด:', math.max(numbers));
console.log('ค่าต่ำสุด:', math.min(numbers));
console.log('π =', math.PI);
console.log('5! =', math.factorial(5));

// ใช้งาน Calculator class
const calc = new math.Calculator();
calc.add(10, 5);
calc.multiply(3, 4);
calc.divide(20, 4);
console.log('ประวัติการคำนวณ:', calc.getHistory());
console.log();

// 3. String Utils Module
console.log('3. String Utils Module:');

const stringUtils = require('./modules/string-utils');

const sampleText = 'สวัสดี โลก node.js';
console.log('ข้อความต้นฉบับ:', sampleText);
console.log('Capitalize words:', stringUtils.capitalizeWords(sampleText));
console.log('ย้อนกลับ:', stringUtils.reverse(sampleText));
console.log('จำนวนคำ:', stringUtils.countWords(sampleText));
console.log('จำนวนตัวอักษร:', stringUtils.countCharacters(sampleText));

const email = 'somchai.jaidee@example.com';
console.log('อีเมล:', email);
console.log('ถูกต้องหรือไม่:', stringUtils.isValidEmail(email));
console.log('ซ่อนอีเมล:', stringUtils.maskEmail(email));

const phone = '08-1234-5678';
console.log('เบอร์โทร:', phone);
console.log('ถูกต้องหรือไม่:', stringUtils.isValidThaiPhone(phone));

// ใช้งาน StringProcessor class
const processor = new stringUtils.StringProcessor('hello world nodejs');
const result = processor
    .capitalize()
    .replace('nodejs', 'Node.js')
    .getValue();
console.log('String processing result:', result);
console.log();

// 4. User Module
console.log('4. User Module:');

const { UserManager, createSampleUsers } = require('./modules/user');

// สร้าง UserManager และข้อมูลตัวอย่าง
const userManager = createSampleUsers();

console.log('ผู้ใช้ทั้งหมด:');
userManager.getAllUsers().forEach(user => {
    console.log(`- ${user.getFullName()} (${user.email}) อายุ ${user.getAge()} ปี`);
});

// สร้างผู้ใช้ใหม่
try {
    const newUser = userManager.createUser({
        firstName: 'อรุณ',
        lastName: 'สว่างใส',
        email: 'arun@example.com',
        phone: '06-9999-8888',
        birthDate: '1995-03-10'
    });
    console.log('สร้างผู้ใช้ใหม่สำเร็จ:', newUser.getFullName());
} catch (error) {
    console.log('ไม่สามารถสร้างผู้ใช้ได้:', error.message);
}

// ค้นหาผู้ใช้
const searchResults = userManager.searchUsers('สม');
console.log('ผลการค้นหา "สม":');
searchResults.forEach(user => {
    console.log(`- ${user.getFullName()}`);
});

// แสดงสถิติ
const stats = userManager.getStats();
console.log('สถิติผู้ใช้:', {
    'จำนวนผู้ใช้ทั้งหมด': stats.totalUsers,
    'อายุเฉลี่ย': Math.round(stats.averageAge),
    'มีเบอร์โทร': stats.usersWithPhone,
    'ผู้ใช้ใหม่ (7 วันล่าสุด)': stats.recentUsers
});
console.log();

// 5. การใช้งาน Module ร่วมกัน
console.log('5. การใช้งาน Modules ร่วมกัน:');

// สร้างรายงานผู้ใช้
function generateUserReport() {
    const users = userManager.getAllUsers();
    const totalUsers = users.length;
    const avgAge = users
        .filter(u => u.getAge())
        .reduce((sum, u, _, arr) => sum + u.getAge() / arr.length, 0);
    
    const report = `
=== รายงานผู้ใช้ ===
จำนวนผู้ใช้: ${stringUtils.formatNumber(totalUsers)} คน
อายุเฉลี่ย: ${math.average(users.map(u => u.getAge() || 0)).toFixed(1)} ปี
ข้อมูลล่าสุด: ${new Date().toLocaleString('th-TH')}

รายชื่อผู้ใช้:
${users.map(u => `- ${stringUtils.capitalizeWords(u.getFullName())} (${u.email})`).join('\n')}
`;
    
    return report.trim();
}

console.log(generateUserReport());
console.log();

// 6. Module Exports แบบต่าง ๆ
console.log('6. รูปแบบการ Export ต่าง ๆ:');

// สร้างโมดูลแบบ inline
const inlineModule = (() => {
    let counter = 0;
    
    return {
        increment() {
            return ++counter;
        },
        decrement() {
            return --counter;
        },
        get current() {
            return counter;
        },
        reset() {
            counter = 0;
            return counter;
        }
    };
})();

console.log('Counter:', inlineModule.current);
console.log('Increment:', inlineModule.increment());
console.log('Increment:', inlineModule.increment());
console.log('Current:', inlineModule.current);
console.log('Reset:', inlineModule.reset());

// 7. Error Handling ใน Modules
console.log('\n7. Error Handling ใน Modules:');

try {
    math.divide(10, 0); // จะเกิด error
} catch (error) {
    console.log('จับ error ได้:', error.message);
}

try {
    userManager.createUser({
        firstName: 'ไม่มี',
        lastName: 'อีเมล'
        // ไม่มี email จะเกิด error
    });
} catch (error) {
    console.log('จับ error การสร้างผู้ใช้:', error.message);
}

console.log('\n=== จบ Lab 2: Modules ===');