// event-loop.js - ทำความเข้าใจ Event Loop ใน Node.js

console.log('=== Event Loop ใน Node.js ===\n');

// 1. การเข้าใจลำดับการทำงานของ Event Loop
console.log('1. ลำดับการทำงานของ Event Loop:');

console.log('1. Start - Synchronous');

// Immediate (setImmediate)
setImmediate(() => {
    console.log('4. setImmediate - Check phase');
});

// Process.nextTick
process.nextTick(() => {
    console.log('2. process.nextTick - มีลำดับความสำคัญสูงสุด');
});

// Promise (Microtask)
Promise.resolve().then(() => {
    console.log('3. Promise.resolve - Microtask queue');
});

// Timer (setTimeout)
setTimeout(() => {
    console.log('5. setTimeout - Timer phase');
}, 0);

console.log('6. End - Synchronous');
console.log();

// 2. Event Loop Phases อย่างละเอียด
console.log('2. Event Loop Phases Detail:');

setTimeout(() => {
    console.log('\n=== Phase Demo ===');
    
    // Timer Phase
    setTimeout(() => {
        console.log('Timer Phase: setTimeout');
    }, 0);
    
    // I/O Callbacks Phase
    const fs = require('fs');
    fs.readFile(__filename, () => {
        console.log('I/O Phase: fs.readFile callback');
        
        // ใน I/O callback สามารถ queue งานใหม่ได้
        setTimeout(() => {
            console.log('Timer ใน I/O callback');
        }, 0);
        
        setImmediate(() => {
            console.log('setImmediate ใน I/O callback');
        });
    });
    
    // Check Phase
    setImmediate(() => {
        console.log('Check Phase: setImmediate');
    });
    
}, 100);

// 3. ลำดับความสำคัญของ Microtasks
console.log('\n3. Microtask Priority:');

setTimeout(() => {
    console.log('\n=== Microtask Priority Demo ===');
    
    // สร้าง macro task
    setTimeout(() => {
        console.log('Macro Task 1');
    }, 0);
    
    // สร้าง microtasks หลายตัว
    Promise.resolve().then(() => {
        console.log('Microtask 1 - Promise');
        
        // Nested microtask
        Promise.resolve().then(() => {
            console.log('Nested Microtask');
        });
    });
    
    process.nextTick(() => {
        console.log('Microtask 0 - nextTick (สูงสุด)');
        
        // Nested nextTick
        process.nextTick(() => {
            console.log('Nested nextTick');
        });
    });
    
    Promise.resolve().then(() => {
        console.log('Microtask 2 - Promise');
    });
    
    setTimeout(() => {
        console.log('Macro Task 2');
    }, 0);
    
}, 200);

// 4. การจำลอง Heavy Computation และ Event Loop
console.log('\n4. Heavy Computation และ Event Loop:');

function heavyComputation(n) {
    console.log(`เริ่มการคำนวณหนัก (${n} iterations)...`);
    const start = Date.now();
    
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += Math.random();
    }
    
    const end = Date.now();
    console.log(`การคำนวณเสร็จ ใช้เวลา: ${end - start}ms`);
    return sum;
}

setTimeout(() => {
    console.log('\n=== Heavy Computation Demo ===');
    
    // Timer ก่อนการคำนวณ
    setTimeout(() => {
        console.log('Timer ระหว่างการคำนวณ (อาจจะล่าช้า)');
    }, 10);
    
    // การคำนวณหนักที่จะบล็อก Event Loop
    const result = heavyComputation(10000000);
    
    // Timer หลังการคำนวณ
    setTimeout(() => {
        console.log('Timer หลังการคำนวณ');
    }, 0);
    
    console.log('ผลลัพธ์การคำนวณ:', result.toFixed(2));
    
}, 300);

// 5. การใช้ setImmediate vs setTimeout
console.log('\n5. setImmediate vs setTimeout:');

setTimeout(() => {
    console.log('\n=== setImmediate vs setTimeout ===');
    
    // ใน main thread
    console.log('ใน Main Thread:');
    setTimeout(() => console.log('setTimeout ใน main'), 0);
    setImmediate(() => console.log('setImmediate ใน main'));
    
    // ใน I/O callback จะมีพฤติกรรมที่แน่นอน
    const fs = require('fs');
    fs.readFile(__filename, () => {
        console.log('ใน I/O Callback:');
        setTimeout(() => console.log('setTimeout ใน I/O'), 0);
        setImmediate(() => console.log('setImmediate ใน I/O (จะทำงานก่อนเสมอ)'));
    });
    
}, 400);

// 6. Memory และ Event Loop
console.log('\n6. Memory และ Event Loop:');

setTimeout(() => {
    console.log('\n=== Memory และ Event Loop ===');
    
    function showMemory(label) {
        const usage = process.memoryUsage();
        console.log(`${label} - Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)} MB`);
    }
    
    showMemory('เริ่มต้น');
    
    // สร้าง objects จำนวนมาก
    const data = [];
    for (let i = 0; i < 100000; i++) {
        data.push({
            id: i,
            name: `Item ${i}`,
            data: new Array(100).fill(Math.random())
        });
    }
    
    showMemory('หลังสร้าง objects');
    
    // ให้ Garbage Collector ทำงาน
    if (global.gc) {
        global.gc();
        showMemory('หลัง Garbage Collection');
    } else {
        console.log('รัน node --expose-gc เพื่อใช้ manual GC');
    }
    
    // Clear ข้อมูล
    data.length = 0;
    
    setTimeout(() => {
        showMemory('หลัง clear array');
    }, 100);
    
}, 500);

console.log('\n=== Event Loop Demo เริ่มต้นแล้ว ===');
console.log('รอให้ทุกส่วนทำงานเสร็จ...');