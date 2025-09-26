// middleware/validation.js - Input validation middleware

// Validation rules
const validationRules = {
    email: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },
    
    phoneNumber: (value) => {
        const phoneRegex = /^(\+66|66|0)(6|8|9)\d{8}$/;
        return phoneRegex.test(value.replace(/[-\s]/g, ''));
    },
    
    strongPassword: (value) => {
        // อย่างน้อย 8 ตัวอักษร, มีตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, และตัวเลข
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(value);
    },
    
    thaiText: (value) => {
        const thaiRegex = /^[ก-๙\s]+$/;
        return thaiRegex.test(value);
    },
    
    positiveNumber: (value) => {
        return !isNaN(value) && parseFloat(value) > 0;
    },
    
    age: (value) => {
        const age = parseInt(value);
        return age >= 0 && age <= 150;
    }
};

// สร้าง validation schema
function createValidationSchema(schema) {
    return (req, res, next) => {
        console.log('✅ Validation middleware ทำงาน');
        
        const errors = [];
        const data = { ...req.body, ...req.query, ...req.params };
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            
            // ตรวจสอบ required
            if (rules.required && (!value || value.toString().trim() === '')) {
                errors.push({
                    field,
                    message: `${field} is required`,
                    messagesTH: `กรุณากรอก ${field}`
                });
                continue;
            }
            
            // Skip validation if field is not required and empty
            if (!rules.required && (!value || value.toString().trim() === '')) {
                continue;
            }
            
            // ตรวจสอบ type
            if (rules.type) {
                if (rules.type === 'number' && isNaN(value)) {
                    errors.push({
                        field,
                        message: `${field} must be a number`,
                        messageTH: `${field} ต้องเป็นตัวเลข`
                    });
                    continue;
                }
                
                if (rules.type === 'string' && typeof value !== 'string') {
                    errors.push({
                        field,
                        message: `${field} must be a string`,
                        messageTH: `${field} ต้องเป็นข้อความ`
                    });
                    continue;
                }
            }
            
            // ตรวจสอบ length
            if (rules.minLength && value.toString().length < rules.minLength) {
                errors.push({
                    field,
                    message: `${field} must be at least ${rules.minLength} characters`,
                    messageTH: `${field} ต้องมีความยาวอย่างน้อย ${rules.minLength} ตัวอักษร`
                });
            }
            
            if (rules.maxLength && value.toString().length > rules.maxLength) {
                errors.push({
                    field,
                    message: `${field} must not exceed ${rules.maxLength} characters`,
                    messageTH: `${field} ต้องมีความยาวไม่เกิน ${rules.maxLength} ตัวอักษร`
                });
            }
            
            // ตรวจสอบ min/max value
            if (rules.min && parseFloat(value) < rules.min) {
                errors.push({
                    field,
                    message: `${field} must be at least ${rules.min}`,
                    messageTH: `${field} ต้องมีค่าอย่างน้อย ${rules.min}`
                });
            }
            
            if (rules.max && parseFloat(value) > rules.max) {
                errors.push({
                    field,
                    message: `${field} must not exceed ${rules.max}`,
                    messageTH: `${field} ต้องมีค่าไม่เกิน ${rules.max}`
                });
            }
            
            // ตรวจสอบ pattern
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push({
                    field,
                    message: rules.patternMessage || `${field} format is invalid`,
                    messageTH: rules.patternMessageTH || `รูปแบบ ${field} ไม่ถูกต้อง`
                });
            }
            
            // ตรวจสอบ custom validation
            if (rules.custom) {
                const customResult = rules.custom(value, data);
                if (customResult !== true) {
                    errors.push({
                        field,
                        message: customResult,
                        messageTH: customResult
                    });
                }
            }
            
            // ตรวจสอบ predefined rules
            if (rules.rule && validationRules[rules.rule]) {
                if (!validationRules[rules.rule](value)) {
                    const messages = {
                        email: 'รูปแบบอีเมลไม่ถูกต้อง',
                        phoneNumber: 'รูปแบบเบอร์โทรไม่ถูกต้อง',
                        strongPassword: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข',
                        thaiText: 'ต้องเป็นข้อความภาษาไทยเท่านั้น',
                        positiveNumber: 'ต้องเป็นตัวเลขที่มากกว่าศูนย์',
                        age: 'อายุต้องอยู่ระหว่าง 0-150 ปี'
                    };
                    
                    errors.push({
                        field,
                        message: `Invalid ${field}`,
                        messageTH: messages[rules.rule] || `${field} ไม่ถูกต้อง`
                    });
                }
            }
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                messageTH: 'ข้อมูลไม่ถูกต้อง',
                errors
            });
        }
        
        // เก็บ validated data
        req.validatedData = data;
        next();
    };
}

// Predefined validation schemas
const userValidation = createValidationSchema({
    name: {
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 100
    },
    email: {
        required: true,
        type: 'string',
        rule: 'email'
    },
    age: {
        required: false,
        type: 'number',
        rule: 'age'
    },
    phone: {
        required: false,
        type: 'string',
        rule: 'phoneNumber'
    }
});

const loginValidation = createValidationSchema({
    username: {
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 50
    },
    password: {
        required: true,
        type: 'string',
        minLength: 6
    }
});

const passwordChangeValidation = createValidationSchema({
    currentPassword: {
        required: true,
        type: 'string'
    },
    newPassword: {
        required: true,
        type: 'string',
        rule: 'strongPassword'
    },
    confirmPassword: {
        required: true,
        type: 'string',
        custom: (value, data) => {
            if (value !== data.newPassword) {
                return 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน';
            }
            return true;
        }
    }
});

// File upload validation
function fileUploadValidation(options = {}) {
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB
    const required = options.required || false;
    
    return (req, res, next) => {
        console.log('📎 File upload validation middleware ทำงาน');
        
        if (!req.files && required) {
            return res.status(400).json({
                success: false,
                message: 'File is required',
                messageTH: 'กรุณาอัพโหลดไฟล์'
            });
        }
        
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : [req.files];
            
            for (const file of files) {
                // Check file type
                if (!allowedTypes.includes(file.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        message: `File type ${file.mimetype} is not allowed`,
                        messageTH: `ไม่รองรับไฟล์ประเภท ${file.mimetype}`,
                        allowedTypes
                    });
                }
                
                // Check file size
                if (file.size > maxSize) {
                    return res.status(400).json({
                        success: false,
                        message: `File size ${file.size} exceeds limit ${maxSize}`,
                        messageTH: `ขนาดไฟล์เกินกำหนด (สูงสุด ${Math.round(maxSize / 1024 / 1024)}MB)`
                    });
                }
            }
        }
        
        next();
    };
}

module.exports = {
    createValidationSchema,
    validationRules,
    userValidation,
    loginValidation,
    passwordChangeValidation,
    fileUploadValidation
};