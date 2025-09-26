// commonjs-example.js - ตัวอย่าง CommonJS รูปแบบต่าง ๆ

console.log('=== CommonJS Examples ===\n');

// 1. รูปแบบการ require แบบต่าง ๆ
console.log('1. รูปแบบการ require:');

// require ทั้งโมดูล
const math = require('./modules/math');
console.log('require ทั้งโมดูล:', typeof math);

// require เฉพาะฟังก์ชันที่ต้องการ (destructuring)
const { add, subtract, multiply } = require('./modules/math');
console.log('Destructuring:', add(5, 3), subtract(10, 2), multiply(4, 6));

// require และตั้งชื่อใหม่
const { Calculator: Calc } = require('./modules/math');
const myCalc = new Calc();
console.log('Rename class:', myCalc.add(1, 2));

// require core modules
const path = require('path');
const util = require('util');
console.log('Core module - path.basename:', path.basename(__filename));
console.log();

// 2. การสร้างโมดูลแบบ inline
console.log('2. การสร้างโมดูล inline:');

// โมดูลง่าย ๆ
const simpleModule = {
    greeting: 'สวัสดี',
    sayHello: function(name) {
        return `${this.greeting} ${name}!`;
    },
    version: '1.0.0'
};

console.log(simpleModule.sayHello('สมชาย'));

// โมดูลที่มี private variables
const counterModule = (() => {
    let count = 0;
    const prefix = 'Count: ';
    
    return {
        increment() {
            count++;
            return prefix + count;
        },
        decrement() {
            count--;
            return prefix + count;
        },
        getValue() {
            return count;
        }
    };
})();

console.log(counterModule.increment());
console.log(counterModule.increment());
console.log('Current value:', counterModule.getValue());
console.log();

// 3. การใช้ module.exports แบบต่าง ๆ
console.log('3. รูปแบบ module.exports:');

// สำหรับทดสอบ - สร้างโมดูลจำลอง
function createMockModule() {
    // รูปแบบที่ 1: export เป็น object
    const exports1 = {
        name: 'Module 1',
        version: '1.0.0',
        init() {
            return `${this.name} v${this.version} initialized`;
        }
    };
    
    // รูปแบบที่ 2: export เป็น function
    function exports2(message) {
        return `Module 2 says: ${message}`;
    }
    exports2.version = '2.0.0';
    exports2.author = 'Node.js Lab';
    
    // รูปแบบที่ 3: export เป็น class
    class Module3 {
        constructor(name) {
            this.name = name;
            this.created = new Date();
        }
        
        getInfo() {
            return {
                name: this.name,
                created: this.created,
                uptime: Date.now() - this.created.getTime()
            };
        }
    }
    
    return { exports1, exports2, Module3 };
}

const { exports1, exports2, Module3 } = createMockModule();

console.log('Export as object:', exports1.init());
console.log('Export as function:', exports2('Hello World'));
console.log('Function properties:', exports2.version, exports2.author);

const module3Instance = new Module3('Test Module');
console.log('Export as class:', module3Instance.getInfo());
console.log();

// 4. Module Caching
console.log('4. Module Caching:');

// require เดียวกันหลายครั้ง
const mathModule1 = require('./modules/math');
const mathModule2 = require('./modules/math');

console.log('Same module reference:', mathModule1 === mathModule2);
console.log('Math module cached:', require.cache[require.resolve('./modules/math')] !== undefined);

// ดู cache keys
const cacheKeys = Object.keys(require.cache).filter(key => key.includes('modules'));
console.log('Cached modules:', cacheKeys.map(key => path.basename(key)));
console.log();

// 5. การจัดการ Module Path
console.log('5. Module Path Resolution:');

console.log('Current file:', __filename);
console.log('Current dir:', __dirname);
console.log('Module resolve:', require.resolve('./modules/math'));

// Module paths ที่ Node.js ใช้หา modules
console.log('Module paths:');
module.paths.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p}`);
});
console.log();

// 6. Circular Dependencies (การอ้างอิงแบบวนรอบ)
console.log('6. Circular Dependencies:');

// สร้างตัวอย่างจำลอง circular dependency
const moduleA = {
    name: 'Module A',
    getB: null, // จะถูกกำหนดทีหลัง
    introduce() {
        return `I am ${this.name}`;
    }
};

const moduleB = {
    name: 'Module B', 
    getA: () => moduleA,
    introduce() {
        return `I am ${this.name}, and I know ${this.getA().name}`;
    }
};

moduleA.getB = () => moduleB;

console.log(moduleA.introduce());
console.log(moduleB.introduce());
console.log('A knows B:', moduleA.getB().name);
console.log('B knows A:', moduleB.getA().name);
console.log();

// 7. Module Factory Pattern
console.log('7. Module Factory Pattern:');

function createLogger(prefix = 'LOG') {
    const timestamp = () => new Date().toISOString();
    
    return {
        info(message) {
            console.log(`[${prefix}] ${timestamp()} INFO: ${message}`);
        },
        warn(message) {
            console.log(`[${prefix}] ${timestamp()} WARN: ${message}`);
        },
        error(message) {
            console.log(`[${prefix}] ${timestamp()} ERROR: ${message}`);
        }
    };
}

const appLogger = createLogger('APP');
const dbLogger = createLogger('DB');

appLogger.info('Application started');
dbLogger.warn('Connection timeout');
dbLogger.error('Query failed');
console.log();

// 8. Module with Configuration
console.log('8. Module with Configuration:');

function createConfigurableModule(config = {}) {
    const settings = {
        debug: false,
        timeout: 5000,
        retries: 3,
        ...config
    };
    
    return {
        getSettings() {
            return { ...settings };
        },
        
        updateConfig(newConfig) {
            Object.assign(settings, newConfig);
        },
        
        process(data) {
            if (settings.debug) {
                console.log('Processing data:', data);
            }
            
            return {
                processed: true,
                data,
                timestamp: Date.now(),
                config: this.getSettings()
            };
        }
    };
}

const processor1 = createConfigurableModule({ debug: true });
const processor2 = createConfigurableModule({ timeout: 10000 });

console.log('Processor 1 settings:', processor1.getSettings());
console.log('Processing result:', processor1.process('test data'));

console.log('Processor 2 settings:', processor2.getSettings());

console.log('\n=== จบ CommonJS Examples ===');