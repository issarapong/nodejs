// modules/math.js - โมดูลคำนวณ (CommonJS style)

// ฟังก์ชันสำหรับการบวก
function add(a, b) {
    return a + b;
}

// ฟังก์ชันสำหรับการลบ
function subtract(a, b) {
    return a - b;
}

// ฟังก์ชันสำหรับการคูณ
function multiply(a, b) {
    return a * b;
}

// ฟังก์ชันสำหรับการหาร
function divide(a, b) {
    if (b === 0) {
        throw new Error('ไม่สามารถหารด้วยศูนย์ได้');
    }
    return a / b;
}

// ฟังก์ชันหาค่าเฉลี่ย
function average(numbers) {
    if (numbers.length === 0) {
        return 0;
    }
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
}

// ฟังก์ชันหาค่าสูงสุด
function max(numbers) {
    return Math.max(...numbers);
}

// ฟังก์ชันหาค่าต่ำสุด
function min(numbers) {
    return Math.min(...numbers);
}

// คลาสสำหรับเครื่องคิดเลข
class Calculator {
    constructor() {
        this.history = [];
    }
    
    add(a, b) {
        const result = add(a, b);
        this.history.push(`${a} + ${b} = ${result}`);
        return result;
    }
    
    subtract(a, b) {
        const result = subtract(a, b);
        this.history.push(`${a} - ${b} = ${result}`);
        return result;
    }
    
    multiply(a, b) {
        const result = multiply(a, b);
        this.history.push(`${a} × ${b} = ${result}`);
        return result;
    }
    
    divide(a, b) {
        const result = divide(a, b);
        this.history.push(`${a} ÷ ${b} = ${result}`);
        return result;
    }
    
    getHistory() {
        return this.history;
    }
    
    clearHistory() {
        this.history = [];
    }
}

// Constants
const PI = 3.14159265359;
const E = 2.71828182846;

// Export แบบ CommonJS
module.exports = {
    add,
    subtract,
    multiply,
    divide,
    average,
    max,
    min,
    Calculator,
    PI,
    E,
    
    // เพิ่มฟังก์ชันพิเศษ
    power: Math.pow,
    sqrt: Math.sqrt,
    factorial: function(n) {
        if (n <= 1) return 1;
        return n * this.factorial(n - 1);
    }
};