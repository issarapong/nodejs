// npm-demo.js - การใช้งาน NPM packages

console.log('=== NPM Packages Demo ===\n');

// หมายเหตุ: รัน npm install ก่อนใช้งาน

// 1. Lodash - Utility library
console.log('1. Lodash Utilities:');

try {
    const _ = require('lodash');
    
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const users = [
        { id: 1, name: 'สมชาย', age: 25, city: 'กรุงเทพ' },
        { id: 2, name: 'สมหญิง', age: 30, city: 'เชียงใหม่' },
        { id: 3, name: 'วิทย์', age: 28, city: 'กรุงเทพ' },
        { id: 4, name: 'สุดา', age: 35, city: 'ภูเก็ต' }
    ];
    
    console.log('Array utilities:');
    console.log('Sum:', _.sum(numbers));
    console.log('Average:', _.mean(numbers));
    console.log('Chunk by 3:', _.chunk(numbers, 3));
    console.log('Shuffle:', _.shuffle([1, 2, 3, 4, 5]));
    
    console.log('\nObject utilities:');
    console.log('Group by city:', _.groupBy(users, 'city'));
    console.log('Sort by age:', _.sortBy(users, 'age'));
    console.log('Find user:', _.find(users, { city: 'กรุงเทพ' }));
    
    console.log('\nString utilities:');
    const text = 'hello-world-nodejs';
    console.log('Camel Case:', _.camelCase(text));
    console.log('Snake Case:', _.snakeCase(text));
    console.log('Kebab Case:', _.kebabCase(text));
    console.log('Start Case:', _.startCase(text));
    
} catch (error) {
    console.log('ไม่สามารถโหลด lodash ได้:', error.message);
    console.log('รัน: npm install lodash');
}
console.log();

// 2. Chalk - Terminal colors
console.log('2. Chalk Colors:');

try {
    const chalk = require('chalk');
    
    console.log(chalk.red('ข้อความสีแดง'));
    console.log(chalk.green('ข้อความสีเขียว'));
    console.log(chalk.blue('ข้อความสีน้ำเงิน'));
    console.log(chalk.yellow.bold('ข้อความสีเหลือง หนา'));
    console.log(chalk.magenta.underline('ข้อความสีม่วง ขีดเส้นใต้'));
    console.log(chalk.cyan.italic('ข้อความสีฟ้า เอียง'));
    
    // Background colors
    console.log(chalk.bgRed.white(' ข้อความพื้นหลังสีแดง '));
    console.log(chalk.bgGreen.black(' ข้อความพื้นหลังสีเขียว '));
    
    // Combinations
    console.log(chalk.red.bgYellow.bold(' คำเตือน! '));
    console.log(chalk.green('✓') + ' สำเร็จ');
    console.log(chalk.red('✗') + ' ล้มเหลว');
    
    // Template strings
    console.log(chalk`
{bold.cyan Node.js Lab} - {yellow การใช้งาน NPM}
{green สถานะ:} {bgGreen.black  ใช้งานได้  }
{blue เวอร์ชั่น:} {yellow 1.0.0}
    `);
    
} catch (error) {
    console.log('ไม่สามารถโหลด chalk ได้:', error.message);
    console.log('รัน: npm install chalk@4.1.2');
}
console.log();

// 3. Moment - Date/Time manipulation
console.log('3. Moment.js Date/Time:');

try {
    const moment = require('moment');
    
    // ตั้งค่า locale เป็นไทย
    moment.locale('th');
    
    const now = moment();
    console.log('วันเวลาปัจจุบัน:', now.format('LLLL'));
    console.log('รูปแบบสั้น:', now.format('DD/MM/YYYY HH:mm:ss'));
    console.log('รูปแบบ ISO:', now.toISOString());
    
    // การคำนวณ
    const birthday = moment('1990-05-15');
    const age = now.diff(birthday, 'years');
    console.log('อายุ:', age, 'ปี');
    console.log('เกิดมาแล้ว:', now.diff(birthday, 'days'), 'วัน');
    
    // การเพิ่มลดวันที่
    const tomorrow = moment().add(1, 'day');
    const lastWeek = moment().subtract(1, 'week');
    
    console.log('พรุ่งนี้:', tomorrow.format('DD/MM/YYYY'));
    console.log('สัปดาห์ที่แล้ว:', lastWeek.format('DD/MM/YYYY'));
    
    // การเปรียบเทียบ
    const date1 = moment('2023-01-01');
    const date2 = moment('2023-12-31');
    
    console.log('date1 อยู่ก่อน date2:', date1.isBefore(date2));
    console.log('ช่วงห่าง:', date2.diff(date1, 'months'), 'เดือน');
    
    // การจัดรูปแบบ
    console.log('เดือนนี้เริ่ม:', moment().startOf('month').format('DD/MM/YYYY'));
    console.log('เดือนนี้จบ:', moment().endOf('month').format('DD/MM/YYYY'));
    
} catch (error) {
    console.log('ไม่สามารถโหลด moment ได้:', error.message);
    console.log('รัน: npm install moment');
}
console.log();

// 4. การสร้าง utility functions ด้วย NPM packages
console.log('4. Utility Functions:');

function createDataProcessor() {
    let _ = null;
    let chalk = null;
    
    try {
        _ = require('lodash');
        chalk = require('chalk');
    } catch (error) {
        console.log('บาง packages ไม่ได้ติดตั้ง');
    }
    
    return {
        processUsers(users) {
            if (!_) {
                return 'ไม่สามารถประมวลผลได้ - ไม่มี lodash';
            }
            
            const stats = {
                total: users.length,
                avgAge: _.mean(users.map(u => u.age)),
                cities: _.uniq(users.map(u => u.city)),
                byCity: _.groupBy(users, 'city')
            };
            
            return stats;
        },
        
        formatMessage(message, type = 'info') {
            if (!chalk) {
                return `[${type.toUpperCase()}] ${message}`;
            }
            
            const colors = {
                info: chalk.blue,
                success: chalk.green,
                warning: chalk.yellow,
                error: chalk.red
            };
            
            const colorFn = colors[type] || chalk.white;
            return colorFn(`[${type.toUpperCase()}] ${message}`);
        },
        
        generateReport(data) {
            const lines = [
                this.formatMessage('การประมวลผลข้อมูล', 'info'),
                this.formatMessage(`ข้อมูลทั้งหมด: ${data.total} รายการ`, 'success'),
                this.formatMessage(`อายุเฉลี่ย: ${data.avgAge?.toFixed(1) || 'N/A'} ปี`, 'info'),
                this.formatMessage(`เมืองที่มีข้อมูล: ${data.cities?.join(', ') || 'N/A'}`, 'info')
            ];
            
            return lines.join('\n');
        }
    };
}

// ทดสอบใช้งาน
const processor = createDataProcessor();

const sampleUsers = [
    { id: 1, name: 'สมชาย', age: 25, city: 'กรุงเทพ' },
    { id: 2, name: 'สมหญิง', age: 30, city: 'เชียงใหม่' },
    { id: 3, name: 'วิทย์', age: 28, city: 'กรุงเทพ' },
    { id: 4, name: 'สุดา', age: 35, city: 'ภูเก็ต' }
];

const processedData = processor.processUsers(sampleUsers);
console.log('ข้อมูลที่ประมวลผล:', processedData);

if (typeof processedData === 'object') {
    console.log('\nรายงาน:');
    console.log(processor.generateReport(processedData));
}

// 5. Package Information
console.log('\n5. Package Information:');

function getPackageInfo(packageName) {
    try {
        const pkg = require(`${packageName}/package.json`);
        return {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            author: pkg.author
        };
    } catch (error) {
        return { error: `ไม่พบ package: ${packageName}` };
    }
}

const packages = ['lodash', 'chalk', 'moment'];
packages.forEach(pkg => {
    const info = getPackageInfo(pkg);
    if (info.error) {
        console.log(`${pkg}: ${info.error}`);
    } else {
        console.log(`${pkg} v${info.version}: ${info.description}`);
    }
});

// 6. การจำลองการทำงานกับ external API (โดยใช้ promises)
console.log('\n6. External API Simulation:');

function simulateAPICall(endpoint, data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() > 0.8) {
                reject(new Error(`API Error: ${endpoint} failed`));
            } else {
                resolve({
                    success: true,
                    endpoint,
                    data,
                    timestamp: new Date().toISOString()
                });
            }
        }, 1000 + Math.random() * 1000);
    });
}

async function demonstrateAPIUsage() {
    const apis = [
        { endpoint: '/users', data: { limit: 10 } },
        { endpoint: '/posts', data: { userId: 1 } },
        { endpoint: '/comments', data: { postId: 1 } }
    ];
    
    console.log('เรียกใช้ APIs...');
    
    for (const api of apis) {
        try {
            const result = await simulateAPICall(api.endpoint, api.data);
            console.log(`✓ ${api.endpoint}: สำเร็จ`);
        } catch (error) {
            console.log(`✗ ${api.endpoint}: ${error.message}`);
        }
    }
}

// เรียกใช้ demo
demonstrateAPIUsage().then(() => {
    console.log('\n=== จบ NPM Demo ===');
});

console.log('\n=== รอให้ API calls เสร็จ... ===');