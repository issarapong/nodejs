// modules/user.js - โมดูลจัดการข้อมูลผู้ใช้

// นำเข้า dependencies
const { isValidEmail, isValidThaiPhone } = require('./string-utils');

// คลาสผู้ใช้
class User {
    constructor(userData = {}) {
        this.id = userData.id || null;
        this.firstName = userData.firstName || '';
        this.lastName = userData.lastName || '';
        this.email = userData.email || '';
        this.phone = userData.phone || '';
        this.birthDate = userData.birthDate ? new Date(userData.birthDate) : null;
        this.address = userData.address || {};
        this.createdAt = userData.createdAt ? new Date(userData.createdAt) : new Date();
        this.updatedAt = new Date();
    }
    
    // ดึงชื่อเต็ม
    getFullName() {
        return `${this.firstName} ${this.lastName}`.trim();
    }
    
    // คำนวณอายุ
    getAge() {
        if (!this.birthDate) return null;
        
        const today = new Date();
        let age = today.getFullYear() - this.birthDate.getFullYear();
        const monthDiff = today.getMonth() - this.birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.birthDate.getDate())) {
            age--;
        }
        
        return age;
    }
    
    // ตรวจสอบข้อมูล
    validate() {
        const errors = [];
        
        if (!this.firstName.trim()) {
            errors.push('กรุณากรอกชื่อ');
        }
        
        if (!this.lastName.trim()) {
            errors.push('กรุณากรอกนามสกุล');
        }
        
        if (!this.email.trim()) {
            errors.push('กรุณากรอกอีเมล');
        } else if (!isValidEmail(this.email)) {
            errors.push('รูปแบบอีเมลไม่ถูกต้อง');
        }
        
        if (this.phone && !isValidThaiPhone(this.phone)) {
            errors.push('รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง');
        }
        
        if (this.birthDate && this.birthDate > new Date()) {
            errors.push('วันเกิดไม่สามารถเป็นอนาคตได้');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // อัพเดทข้อมูล
    update(newData) {
        Object.keys(newData).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && this.hasOwnProperty(key)) {
                this[key] = newData[key];
            }
        });
        this.updatedAt = new Date();
    }
    
    // แปลงเป็น JSON
    toJSON() {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            fullName: this.getFullName(),
            email: this.email,
            phone: this.phone,
            birthDate: this.birthDate,
            age: this.getAge(),
            address: this.address,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// คลาสจัดการรายชื่อผู้ใช้
class UserManager {
    constructor() {
        this.users = new Map();
        this.nextId = 1;
    }
    
    // เพิ่มผู้ใช้ใหม่
    createUser(userData) {
        const user = new User({
            ...userData,
            id: this.nextId++
        });
        
        const validation = user.validate();
        if (!validation.isValid) {
            throw new Error(`ข้อมูลผู้ใช้ไม่ถูกต้อง: ${validation.errors.join(', ')}`);
        }
        
        this.users.set(user.id, user);
        return user;
    }
    
    // หาผู้ใช้จาก ID
    getUserById(id) {
        return this.users.get(id) || null;
    }
    
    // หาผู้ใช้จากอีเมล
    getUserByEmail(email) {
        for (let user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }
    
    // ดึงผู้ใช้ทั้งหมด
    getAllUsers() {
        return Array.from(this.users.values());
    }
    
    // อัพเดทผู้ใช้
    updateUser(id, newData) {
        const user = this.getUserById(id);
        if (!user) {
            throw new Error('ไม่พบผู้ใช้');
        }
        
        user.update(newData);
        
        const validation = user.validate();
        if (!validation.isValid) {
            throw new Error(`ข้อมูลผู้ใช้ไม่ถูกต้อง: ${validation.errors.join(', ')}`);
        }
        
        return user;
    }
    
    // ลบผู้ใช้
    deleteUser(id) {
        const success = this.users.delete(id);
        if (!success) {
            throw new Error('ไม่พบผู้ใช้ที่ต้องการลบ');
        }
        return true;
    }
    
    // ค้นหาผู้ใช้
    searchUsers(query) {
        const results = [];
        const searchTerm = query.toLowerCase();
        
        for (let user of this.users.values()) {
            if (
                user.firstName.toLowerCase().includes(searchTerm) ||
                user.lastName.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm)
            ) {
                results.push(user);
            }
        }
        
        return results;
    }
    
    // สถิติผู้ใช้
    getStats() {
        const allUsers = this.getAllUsers();
        
        return {
            totalUsers: allUsers.length,
            averageAge: allUsers
                .filter(user => user.getAge() !== null)
                .reduce((sum, user, _, arr) => sum + user.getAge() / arr.length, 0),
            usersWithPhone: allUsers.filter(user => user.phone).length,
            recentUsers: allUsers
                .filter(user => (Date.now() - user.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000)
                .length
        };
    }
}

// ฟังก์ชันสำหรับสร้างข้อมูลตัวอย่าง
function createSampleUsers() {
    const manager = new UserManager();
    
    const sampleData = [
        {
            firstName: 'สมชาย',
            lastName: 'ใจดี',
            email: 'somchai@example.com',
            phone: '08-1234-5678',
            birthDate: '1990-05-15',
            address: {
                street: '123 ถนนสุขุมวิท',
                city: 'กรุงเทพฯ',
                zipCode: '10110'
            }
        },
        {
            firstName: 'สมหญิง',
            lastName: 'ใจงาม',
            email: 'somying@example.com',
            phone: '09-8765-4321',
            birthDate: '1992-08-20',
            address: {
                street: '456 ถนนพญาไท',
                city: 'กรุงเทพฯ',
                zipCode: '10400'
            }
        },
        {
            firstName: 'วิทย์',
            lastName: 'เก่งกล้า',
            email: 'wit@example.com',
            phone: '06-1111-2222',
            birthDate: '1988-12-03'
        }
    ];
    
    sampleData.forEach(userData => {
        try {
            manager.createUser(userData);
        } catch (error) {
            console.log(`ไม่สามารถสร้างผู้ใช้: ${error.message}`);
        }
    });
    
    return manager;
}

// Export
module.exports = {
    User,
    UserManager,
    createSampleUsers
};