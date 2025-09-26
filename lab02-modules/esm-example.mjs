// esm-example.mjs - ตัวอย่าง ES Modules (ES6 import/export)

console.log('=== ES Modules Examples ===\n');

// หมายเหตุ: ไฟล์นี้ใช้นามสกุล .mjs เพื่อบอกให้ Node.js รู้ว่าเป็น ES Module
// หรือสามารถใส่ "type": "module" ใน package.json แทนได้

// 1. การ import core modules
console.log('1. Import Core Modules:');

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

// ใน ES modules ไม่มี __dirname และ __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('ES Module filename:', __filename);
console.log('ES Module dirname:', __dirname);
console.log('Platform:', os.platform());
console.log('CPUs:', os.cpus().length);
console.log();

// 2. การ import แบบ dynamic (เพราะเราไม่สามารถ import CommonJS modules ได้โดยตรง)
console.log('2. Dynamic Import:');

async function loadAndUseMathModule() {
    try {
        // Dynamic import สำหรับ CommonJS modules
        const mathModule = await import('./modules/math.js');
        
        console.log('Dynamic import math module:');
        console.log('5 + 3 =', mathModule.default.add(5, 3));
        console.log('10 - 4 =', mathModule.default.subtract(10, 4));
        console.log('π =', mathModule.default.PI);
        
        // ใช้งาน Calculator class
        const Calculator = mathModule.default.Calculator;
        const calc = new Calculator();
        calc.multiply(6, 7);
        console.log('Calculator history:', calc.getHistory());
        
    } catch (error) {
        console.log('Error loading math module:', error.message);
    }
}

await loadAndUseMathModule();
console.log();

// 3. สร้าง ES Module แบบ inline
console.log('3. Inline ES Module:');

// Export/Import แบบ named
const mathUtils = {
    square: (x) => x * x,
    cube: (x) => x * x * x,
    isEven: (x) => x % 2 === 0,
    isPrime: (x) => {
        if (x <= 1) return false;
        for (let i = 2; i <= Math.sqrt(x); i++) {
            if (x % i === 0) return false;
        }
        return true;
    }
};

console.log('Square of 5:', mathUtils.square(5));
console.log('Cube of 3:', mathUtils.cube(3));
console.log('Is 8 even?', mathUtils.isEven(8));
console.log('Is 17 prime?', mathUtils.isPrime(17));
console.log();

// 4. การใช้ import.meta
console.log('4. Import Meta:');

console.log('import.meta.url:', import.meta.url);
console.log('Module URL:', new URL(import.meta.url));

// resolve path relative to current module
const configPath = new URL('./config.json', import.meta.url);
console.log('Config path:', configPath.pathname);
console.log();

// 5. Top-level await (สามารถใช้ await ได้โดยตรงใน top level)
console.log('5. Top-level Await:');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchData(id) {
    console.log(`กำลังโหลดข้อมูล ID: ${id}...`);
    await delay(1000);
    return {
        id,
        name: `Data ${id}`,
        timestamp: new Date().toISOString()
    };
}

// ใช้ top-level await
const data1 = await fetchData(1);
console.log('ได้ข้อมูลแล้ว:', data1);

// Multiple awaits
const [data2, data3] = await Promise.all([
    fetchData(2),
    fetchData(3)
]);

console.log('ได้ข้อมูลหลายตัว:', { data2, data3 });
console.log();

// 6. การจำลอง ES Module exports
console.log('6. ES Module Export Patterns:');

// Named exports
export const VERSION = '1.0.0';
export const AUTHOR = 'Node.js Lab';

export function greet(name) {
    return `สวัสดี ${name} จาก ES Module!`;
}

export class ESModuleExample {
    constructor(name) {
        this.name = name;
        this.created = new Date();
    }
    
    getInfo() {
        return {
            name: this.name,
            created: this.created,
            type: 'ES Module Class'
        };
    }
}

// ทดสอบใช้งาน exports
console.log('Version:', VERSION);
console.log('Author:', AUTHOR);
console.log(greet('สมชาย'));

const example = new ESModuleExample('Test Instance');
console.log('Class instance:', example.getInfo());
console.log();

// 7. การจัดการ Error ใน ES Modules
console.log('7. Error Handling:');

async function demonstrateErrorHandling() {
    try {
        // จำลอง async operation ที่อาจเกิด error
        const result = await new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.5) {
                    resolve('Success!');
                } else {
                    reject(new Error('Random error occurred'));
                }
            }, 500);
        });
        
        console.log('Operation result:', result);
    } catch (error) {
        console.log('จับ error ได้:', error.message);
    }
}

await demonstrateErrorHandling();
console.log();

// 8. Module federation และ conditional imports
console.log('8. Conditional Imports:');

// จำลองการ import แบบมีเงื่อนไข
const useAdvancedFeatures = process.env.NODE_ENV === 'production';

if (useAdvancedFeatures) {
    console.log('Loading advanced features...');
    // const advancedModule = await import('./advanced-features.mjs');
    console.log('(จำลอง) Advanced features loaded');
} else {
    console.log('Using basic features only');
}

// Dynamic import based on condition
const moduleName = Math.random() > 0.5 ? 'os' : 'path';
const dynamicModule = await import(moduleName);
console.log(`Loaded ${moduleName} module:`, typeof dynamicModule.default);
console.log();

// 9. Performance และ Memory usage
console.log('9. Performance Monitoring:');

const startTime = performance.now();

// จำลองการทำงานที่ใช้เวลา
await delay(100);

const endTime = performance.now();
console.log(`Execution time: ${(endTime - startTime).toFixed(2)}ms`);

// Memory usage
const memUsage = process.memoryUsage();
console.log('Memory usage:');
console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
console.log();

// 10. การใช้งาน Web APIs ใน Node.js (เมื่อรองรับ)
console.log('10. Web APIs ใน Node.js:');

// URL API
const url = new URL('https://example.com/path?param=value');
console.log('URL parts:', {
    protocol: url.protocol,
    hostname: url.hostname,
    pathname: url.pathname,
    search: url.search
});

// TextEncoder/TextDecoder
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const text = 'สวัสดี Node.js ES Modules!';
const encoded = encoder.encode(text);
const decoded = decoder.decode(encoded);

console.log('Original text:', text);
console.log('Encoded bytes:', encoded.length);
console.log('Decoded text:', decoded);

console.log('\n=== จบ ES Modules Examples ===');