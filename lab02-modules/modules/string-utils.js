// modules/string-utils.js - โมดูลจัดการ string

// ฟังก์ชันแปลงเป็นพิมพ์ใหญ่แบบไทย
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ฟังก์ชันแปลงทุกคำเป็นพิมพ์ใหญ่ตัวแรก
function capitalizeWords(str) {
    return str.split(' ')
               .map(word => capitalizeFirst(word))
               .join(' ');
}

// ฟังก์ชันย้อนกลับ string
function reverse(str) {
    return str.split('').reverse().join('');
}

// ฟังก์ชันตรวจสอบ palindrome
function isPalindrome(str) {
    const cleanStr = str.toLowerCase().replace(/[^ก-๙a-z0-9]/g, '');
    return cleanStr === reverse(cleanStr);
}

// ฟังก์ชันนับจำนวนคำ
function countWords(str) {
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// ฟังก์ชันนับจำนวนตัวอักษร (ไม่รวมช่องว่าง)
function countCharacters(str, includeSpaces = false) {
    if (includeSpaces) {
        return str.length;
    }
    return str.replace(/\s/g, '').length;
}

// ฟังก์ชันหาคำที่ยาวที่สุด
function findLongestWord(str) {
    const words = str.split(' ');
    return words.reduce((longest, current) => 
        current.length > longest.length ? current : longest, '');
}

// ฟังก์ชันแทนที่ข้อความ
function replaceAll(str, searchValue, replaceValue) {
    return str.split(searchValue).join(replaceValue);
}

// ฟังก์ชันตัดช่องว่างส่วนเกิน
function trimExtraSpaces(str) {
    return str.replace(/\s+/g, ' ').trim();
}

// ฟังก์ชันสร้าง slug สำหรับ URL
function createSlug(str) {
    return str.toLowerCase()
              .replace(/[^ก-๙a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim('-');
}

// ฟังก์ชันตรวจสอบว่าเป็นอีเมลหรือไม่
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ฟังก์ชันตรวจสอบหมายเลขโทรศัพท์ไทย
function isValidThaiPhone(phone) {
    const phoneRegex = /^(\+66|66|0)(6|8|9)\d{8}$/;
    return phoneRegex.test(phone.replace(/[-\s]/g, ''));
}

// ฟังก์ชันซ่อนอีเมล
function maskEmail(email) {
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
        return email;
    }
    const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
    return `${maskedUsername}@${domain}`;
}

// ฟังก์ชันจัดรูปแบบตัวเลข
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ฟังก์ชันแปลงจากงูเป็นอูฐ (snake_case to camelCase)
function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

// ฟังก์ชันแปลงจากอูฐเป็นงู (camelCase to snake_case)
function toSnakeCase(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// คลาสจัดการ string
class StringProcessor {
    constructor(text) {
        this.text = text;
    }
    
    capitalize() {
        this.text = capitalizeWords(this.text);
        return this;
    }
    
    reverse() {
        this.text = reverse(this.text);
        return this;
    }
    
    trim() {
        this.text = trimExtraSpaces(this.text);
        return this;
    }
    
    replace(searchValue, replaceValue) {
        this.text = replaceAll(this.text, searchValue, replaceValue);
        return this;
    }
    
    getValue() {
        return this.text;
    }
    
    reset(newText) {
        this.text = newText;
        return this;
    }
}

// Export ทั้งหมด
module.exports = {
    capitalizeFirst,
    capitalizeWords,
    reverse,
    isPalindrome,
    countWords,
    countCharacters,
    findLongestWord,
    replaceAll,
    trimExtraSpaces,
    createSlug,
    isValidEmail,
    isValidThaiPhone,
    maskEmail,
    formatNumber,
    toCamelCase,
    toSnakeCase,
    StringProcessor
};