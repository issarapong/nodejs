// async-example.js - ตัวอย่าง Asynchronous Programming

console.log('=== Asynchronous Programming ใน Node.js ===\n');

// 1. การเข้าใจ Synchronous vs Asynchronous
console.log('1. Synchronous vs Asynchronous:');

console.log('เริ่มต้น...');

// Synchronous
console.log('นี่คือ synchronous code (บรรทัด 1)');
console.log('นี่คือ synchronous code (บรรทัด 2)');
console.log('นี่คือ synchronous code (บรรทัด 3)');

// Asynchronous
setTimeout(() => {
    console.log('นี่คือ asynchronous code (setTimeout 0ms)');
}, 0);

setTimeout(() => {
    console.log('นี่คือ asynchronous code (setTimeout 1000ms)');
}, 1000);

console.log('นี่คือ synchronous code (บรรทัดสุดท้าย)');
console.log();

// 2. Callback Pattern
console.log('2. Callback Pattern:');

function fetchUserData(userId, callback) {
    console.log(`กำลังดึงข้อมูลผู้ใช้ ID: ${userId}...`);
    
    // จำลอง async operation
    setTimeout(() => {
        const userData = {
            id: userId,
            name: 'สมชาย ใจดี',
            email: 'somchai@example.com',
            age: 28
        };
        
        // เรียก callback เมื่อเสร็จ
        callback(null, userData);
    }, 1500);
}

// ใช้งาน callback
fetchUserData(123, (error, user) => {
    if (error) {
        console.log('เกิดข้อผิดพลาด:', error);
        return;
    }
    console.log('ได้ข้อมูลผู้ใช้แล้ว:', user);
});
console.log('ส่งคำขอดึงข้อมูลแล้ว (ยังไม่ได้ข้อมูล)');
console.log();

// 3. Promise Pattern
console.log('3. Promise Pattern:');

function fetchUserDataPromise(userId) {
    console.log(`กำลังดึงข้อมูลด้วย Promise (ID: ${userId})...`);
    
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (userId <= 0) {
                reject(new Error('User ID ต้องมากกว่า 0'));
                return;
            }
            
            const userData = {
                id: userId,
                name: 'สมหญิง ใจงาม',
                email: 'somying@example.com',
                age: 25
            };
            
            resolve(userData);
        }, 2000);
    });
}

// ใช้งาน Promise
fetchUserDataPromise(456)
    .then(user => {
        console.log('ได้ข้อมูลจาก Promise:', user);
    })
    .catch(error => {
        console.log('Promise Error:', error.message);
    });

console.log('ส่งคำขอด้วย Promise แล้ว');
console.log();

// 4. Async/Await Pattern
console.log('4. Async/Await Pattern:');

async function getUserWithAsyncAwait() {
    try {
        console.log('กำลังดึงข้อมูลด้วย async/await...');
        const user = await fetchUserDataPromise(789);
        console.log('ได้ข้อมูลจาก async/await:', user);
        return user;
    } catch (error) {
        console.log('Async/Await Error:', error.message);
        throw error;
    }
}

// เรียกใช้ async function
getUserWithAsyncAwait()
    .then(user => {
        console.log('Async function เสร็จสิ้น');
    })
    .catch(error => {
        console.log('เกิดข้อผิดพลาดใน async function');
    });

console.log('เรียกใช้ async function แล้ว');
console.log();

// 5. Multiple Async Operations
console.log('5. Multiple Async Operations:');

function simulateAsyncTask(taskName, delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`งาน "${taskName}" เสร็จสิ้น`);
            resolve(`ผลลัพธ์จาก ${taskName}`);
        }, delay);
    });
}

// Promise.all - รอให้ทุก task เสร็จ
console.log('เริ่ม Promise.all...');
Promise.all([
    simulateAsyncTask('งานที่ 1', 1000),
    simulateAsyncTask('งานที่ 2', 1500),
    simulateAsyncTask('งานที่ 3', 800)
]).then(results => {
    console.log('Promise.all เสร็จสิ้น:', results);
});

// Promise.race - รอให้ task ใดเสร็จก่อน
setTimeout(() => {
    console.log('\nเริ่ม Promise.race...');
    Promise.race([
        simulateAsyncTask('งานเร็ว', 500),
        simulateAsyncTask('งานช้า', 2000)
    ]).then(result => {
        console.log('Promise.race เสร็จสิ้น:', result);
    });
}, 3000);

// 6. Error Handling ใน Async Code
console.log('\n6. Error Handling:');

async function demonstrateErrorHandling() {
    try {
        // ทดสอบ error case
        const result = await fetchUserDataPromise(-1);
        console.log('ไม่ควรมาถึงบรรทัดนี้');
    } catch (error) {
        console.log('จับ error ได้:', error.message);
    }
    
    try {
        // ทดสอบ success case
        const result = await fetchUserDataPromise(999);
        console.log('Success case:', result.name);
    } catch (error) {
        console.log('Error ในกรณีที่ควรสำเร็จ:', error.message);
    }
}

setTimeout(() => {
    demonstrateErrorHandling();
}, 4000);

console.log('\n=== จบการสาธิต Asynchronous Programming ===');
console.log('รอให้ทุก async operations เสร็จ...');