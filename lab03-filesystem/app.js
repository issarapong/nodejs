// app.js - Lab 3: File System Operations

console.log('=== Lab 3: File System Operations ===\n');

const fs = require('fs');
const path = require('path');
const util = require('util');

// แปลง callback-based functions เป็น promise-based
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const statAsync = util.promisify(fs.stat);

// 1. การอ่านไฟล์แบบต่าง ๆ
console.log('1. การอ่านไฟล์:');

// แบบ Synchronous
try {
    const syncData = fs.readFileSync('./data/sample.txt', 'utf8');
    console.log('Sync read (5 บรรทัดแรก):');
    console.log(syncData.split('\n').slice(0, 5).join('\n'));
} catch (error) {
    console.log('Error reading sync:', error.message);
}
console.log();

// แบบ Asynchronous (Callback)
fs.readFile('./data/sample.txt', 'utf8', (err, data) => {
    if (err) {
        console.log('Error reading async:', err.message);
        return;
    }
    console.log('Async read (callback) - จำนวนตัวอักษร:', data.length);
});

// แบบ Promise
readFileAsync('./data/sample.txt', 'utf8')
    .then(data => {
        console.log('Promise read - จำนวนบรรทัด:', data.split('\n').length);
    })
    .catch(error => {
        console.log('Promise error:', error.message);
    });

// แบบ async/await
async function readWithAsyncAwait() {
    try {
        const data = await fs.promises.readFile('./data/sample.txt', 'utf8');
        console.log('Async/await read - บรรทัดสุดท้าย:', data.trim().split('\n').pop());
    } catch (error) {
        console.log('Async/await error:', error.message);
    }
}

readWithAsyncAwait();

// 2. การอ่านไฟล์ JSON
console.log('\n2. การอ่านไฟล์ JSON:');

async function readJSONFile() {
    try {
        const jsonData = await fs.promises.readFile('./data/users.json', 'utf8');
        const users = JSON.parse(jsonData);
        
        console.log('ข้อมูลจาก JSON:');
        console.log('จำนวนผู้ใช้:', users.users.length);
        console.log('ผู้ใช้คนแรก:', users.users[0].name);
        console.log('Metadata:', users.metadata.description);
        
        return users;
    } catch (error) {
        console.log('Error reading JSON:', error.message);
        return null;
    }
}

// 3. การเขียนไฟล์
console.log('\n3. การเขียนไฟล์:');

async function writeFiles() {
    try {
        // เขียนไฟล์ text
        const textContent = `สวัสดี Node.js File System!
การเขียนไฟล์ในวันที่: ${new Date().toLocaleString('th-TH')}
บรรทัดที่ 3
บรรทัดที่ 4`;

        await fs.promises.writeFile('./data/output.txt', textContent, 'utf8');
        console.log('✓ เขียนไฟล์ text สำเร็จ');
        
        // เขียนไฟล์ JSON
        const userData = {
            newUser: {
                id: 4,
                name: 'ผู้ใช้ใหม่',
                email: 'newuser@example.com',
                age: 26,
                city: 'นครราชสีมา'
            },
            timestamp: new Date().toISOString(),
            source: 'Node.js File System Lab'
        };
        
        await fs.promises.writeFile(
            './data/new-user.json', 
            JSON.stringify(userData, null, 2), 
            'utf8'
        );
        console.log('✓ เขียนไฟล์ JSON สำเร็จ');
        
        // Append ไฟล์
        const appendContent = `\nบรรทัดเพิ่มเติม: ${Date.now()}`;
        await fs.promises.appendFile('./data/output.txt', appendContent);
        console.log('✓ Append ไฟล์สำเร็จ');
        
    } catch (error) {
        console.log('Error writing files:', error.message);
    }
}

writeFiles();

// 4. การอ่านข้อมูลไฟล์ (File Stats)
console.log('\n4. ข้อมูลไฟล์ (Stats):');

async function getFileStats() {
    const files = ['./data/sample.txt', './data/users.json', './data/users.csv'];
    
    for (const file of files) {
        try {
            const stats = await statAsync(file);
            const fileName = path.basename(file);
            
            console.log(`📄 ${fileName}:`);
            console.log(`   ขนาด: ${stats.size} bytes`);
            console.log(`   สร้างเมื่อ: ${stats.birthtime.toLocaleString('th-TH')}`);
            console.log(`   แก้ไขล่าสุด: ${stats.mtime.toLocaleString('th-TH')}`);
            console.log(`   เป็นไฟล์: ${stats.isFile()}`);
            console.log(`   เป็นไดเรกทอรี: ${stats.isDirectory()}`);
            console.log();
        } catch (error) {
            console.log(`Error getting stats for ${file}:`, error.message);
        }
    }
}

setTimeout(getFileStats, 500);

// 5. การคัดลอกไฟล์
console.log('\n5. การคัดลอกไฟล์:');

async function copyFiles() {
    try {
        // คัดลอกแบบง่าย
        await fs.promises.copyFile('./data/sample.txt', './data/sample-copy.txt');
        console.log('✓ คัดลอกไฟล์สำเร็จ');
        
        // คัดลอกพร้อมเช็คว่ามีไฟล์อยู่แล้วหรือไม่
        await fs.promises.copyFile(
            './data/users.json', 
            './data/users-backup.json',
            fs.constants.COPYFILE_EXCL // จะ fail ถ้าไฟล์ปลายทางมีอยู่แล้ว
        );
        console.log('✓ สร้างไฟล์ backup สำเร็จ');
        
    } catch (error) {
        if (error.code === 'EEXIST') {
            console.log('ℹ ไฟล์ backup มีอยู่แล้ว');
        } else {
            console.log('Error copying files:', error.message);
        }
    }
}

setTimeout(copyFiles, 1000);

// 6. การลบไฟล์
async function cleanupFiles() {
    const filesToDelete = [
        './data/output.txt',
        './data/sample-copy.txt',
        './data/new-user.json'
    ];
    
    console.log('\n6. การลบไฟล์ (ทำความสะอาด):');
    
    for (const file of filesToDelete) {
        try {
            await fs.promises.unlink(file);
            console.log(`✓ ลบ ${path.basename(file)} สำเร็จ`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`ℹ ${path.basename(file)} ไม่มีอยู่`);
            } else {
                console.log(`Error deleting ${file}:`, error.message);
            }
        }
    }
}

// 7. การประมวลผลไฟล์ CSV
console.log('\n7. การประมวลผลไฟล์ CSV:');

async function processCSV() {
    try {
        const csvData = await fs.promises.readFile('./data/users.csv', 'utf8');
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',');
        
        console.log('Headers:', headers);
        console.log('จำนวนแถว:', lines.length - 1);
        
        // แปลงเป็น objects
        const users = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.replace(/"/g, ''));
            const user = {};
            headers.forEach((header, index) => {
                user[header] = values[index];
            });
            return user;
        });
        
        console.log('ผู้ใช้ทั้งหมด:');
        users.forEach(user => {
            console.log(`- ${user.name} (${user.city})`);
        });
        
        // สร้างรายงาน
        const cities = [...new Set(users.map(u => u.city))];
        const avgAge = users.reduce((sum, u) => sum + parseInt(u.age), 0) / users.length;
        
        console.log(`เมืองที่มีข้อมูล: ${cities.join(', ')}`);
        console.log(`อายุเฉลี่ย: ${avgAge.toFixed(1)} ปี`);
        
    } catch (error) {
        console.log('Error processing CSV:', error.message);
    }
}

setTimeout(processCSV, 1500);

// 8. การทำงานแบบ batch
async function batchOperations() {
    console.log('\n8. Batch Operations:');
    
    const operations = [
        () => readJSONFile(),
        () => processCSV(),
        () => getFileStats()
    ];
    
    try {
        const results = await Promise.all(operations.map(op => op()));
        console.log('✓ ทุก batch operations เสร็จสิ้น');
    } catch (error) {
        console.log('Error in batch operations:', error.message);
    }
}

// รอสักครู่แล้วทำความสะอาด
setTimeout(() => {
    cleanupFiles().then(() => {
        console.log('\n=== จบ Lab 3: File System ===');
    });
}, 3000);