// Lab 1: การใช้งาน Node.js เบื้องต้น
console.log('=== Lab 1: Node.js พื้นฐาน ===\n');

// 1. การแสดงผลพื้นฐาน
console.log('1. การแสดงผลพื้นฐาน:');
console.log('สวัสดี Node.js!');
console.log('Hello Node.js!');
console.log('เวอร์ชั่น Node.js:', process.version);
console.log('แพลตฟอร์ม:', process.platform);
console.log();

// 2. การทำงานกับตัวแปรและ data types
console.log('2. ตัวแปรและ Data Types:');
let name = 'สมชาย';
const age = 25;
var isStudent = true;

console.log(`ชื่อ: ${name}`);
console.log(`อายุ: ${age} ปี`);
console.log(`เป็นนักเรียน: ${isStudent}`);

// Array และ Object
const fruits = ['แอปเปิล', 'กล้วย', 'ส้ม'];
const person = {
    name: 'สมหญิง',
    age: 23,
    city: 'กรุงเทพ'
};

console.log('ผลไม้:', fruits);
console.log('ข้อมูลบุคคล:', person);
console.log();

// 3. Functions
console.log('3. การใช้งาน Functions:');

function greet(name) {
    return `สวัสดี ${name}!`;
}

const calculateArea = (width, height) => {
    return width * height;
};

console.log(greet('น้องมิ้น'));
console.log(`พื้นที่สี่เหลี่ยม 5x3 = ${calculateArea(5, 3)}`);
console.log();

// 4. การจัดการ Error พื้นฐาน
console.log('4. การจัดการ Error:');

try {
    let result = 10 / 0;
    if (!isFinite(result)) {
        throw new Error('ไม่สามารถหารด้วย 0 ได้');
    }
    console.log('ผลลัพธ์:', result);
} catch (error) {
    console.log('เกิดข้อผิดพลาด:', error.message);
}
console.log();

// 5. การใช้งาน setTimeout (Asynchronous)
console.log('5. Asynchronous Programming:');
console.log('เริ่มต้นการทำงาน...');

setTimeout(() => {
    console.log('ข้อความนี้จะแสดงหลังจาก 2 วินาที');
}, 2000);

setTimeout(() => {
    console.log('ข้อความนี้จะแสดงหลังจาก 1 วินาที');
}, 1000);

console.log('สิ้นสุดการทำงาน synchronous (แต่ async ยังทำงานอยู่)');
console.log();

// 6. การทำงานกับ JSON
console.log('6. การทำงานกับ JSON:');

const student = {
    id: 1,
    name: 'นายพิชิต',
    subjects: ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ'],
    gpa: 3.75
};

const jsonString = JSON.stringify(student);
console.log('JSON String:', jsonString);

const parsedObject = JSON.parse(jsonString);
console.log('Parsed Object:', parsedObject);
console.log();

console.log('=== จบ Lab 1 ===');