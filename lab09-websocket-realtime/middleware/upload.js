/**
 * File Upload Middleware
 * จัดการการอัพโหลดไฟล์สำหรับ chat และ avatar
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// กำหนดประเภทไฟล์ที่อนุญาต
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  archive: ['application/zip', 'application/x-rar-compressed']
};

const ALL_ALLOWED_TYPES = Object.values(ALLOWED_FILE_TYPES).flat();

// กำหนดขนาดไฟล์สูงสุด (ใน bytes)
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024,    // 5MB
  document: 10 * 1024 * 1024, // 10MB
  audio: 20 * 1024 * 1024,    // 20MB
  video: 50 * 1024 * 1024,    // 50MB
  archive: 25 * 1024 * 1024,  // 25MB
  default: 10 * 1024 * 1024   // 10MB
};

/**
 * สร้าง storage configuration
 */
const createStorage = (destination = 'uploads/') => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        // สร้างโฟลเดอร์ตามประเภทไฟล์
        const fileType = getFileType(file.mimetype);
        const uploadPath = path.join(destination, fileType);
        
        // สร้างโฟลเดอร์ถ้ายังไม่มี
        await fs.mkdir(uploadPath, { recursive: true });
        
        cb(null, uploadPath);
      } catch (error) {
        cb(error);
      }
    },
    
    filename: (req, file, cb) => {
      // สร้างชื่อไฟล์ที่ไม่ซ้ำ
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `${timestamp}-${uniqueId}${extension}`;
      
      cb(null, filename);
    }
  });
};

/**
 * กำหนดประเภทไฟล์จาก mimetype
 */
function getFileType(mimetype) {
  for (const [type, mimetypes] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (mimetypes.includes(mimetype)) {
      return type;
    }
  }
  return 'other';
}

/**
 * ตรวจสอบประเภทไฟล์
 */
const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

/**
 * ตรวจสอบขนาดไฟล์
 */
const checkFileSize = (req, file, cb) => {
  const fileType = getFileType(file.mimetype);
  const maxSize = MAX_FILE_SIZES[fileType] || MAX_FILE_SIZES.default;
  
  if (file.size > maxSize) {
    return cb(new Error(`File too large. Maximum size for ${fileType} is ${Math.round(maxSize / (1024 * 1024))}MB`), false);
  }
  
  cb(null, true);
};

/**
 * Middleware สำหรับอัพโหลดไฟล์ chat
 */
const uploadChatFile = multer({
  storage: createStorage('uploads/chat/'),
  fileFilter: fileFilter,
  limits: {
    fileSize: Math.max(...Object.values(MAX_FILE_SIZES)),
    files: 5 // อนุญาตสูงสุด 5 ไฟล์ต่อครั้ง
  }
}).array('files', 5);

/**
 * Middleware สำหรับอัพโหลด avatar
 */
const uploadAvatar = multer({
  storage: createStorage('uploads/avatars/'),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.image.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars'), false);
    }
  },
  limits: {
    fileSize: MAX_FILE_SIZES.image,
    files: 1
  }
}).single('avatar');

/**
 * Middleware สำหรับประมวลผลรูปภาพ
 */
const processImage = async (req, res, next) => {
  if (!req.file || !ALLOWED_FILE_TYPES.image.includes(req.file.mimetype)) {
    return next();
  }

  try {
    const inputPath = req.file.path;
    const filename = req.file.filename;
    const nameWithoutExt = path.parse(filename).name;
    const outputDir = path.dirname(inputPath);

    // สร้าง thumbnail
    const thumbnailPath = path.join(outputDir, `thumb-${nameWithoutExt}.webp`);
    await sharp(inputPath)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    // Optimize original image
    const optimizedPath = path.join(outputDir, `opt-${nameWithoutExt}.webp`);
    const metadata = await sharp(inputPath)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(optimizedPath);

    // เพิ่มข้อมูลการประมวลผลใน req.file
    req.file.thumbnail = `/uploads/${path.relative('uploads/', thumbnailPath)}`;
    req.file.optimized = `/uploads/${path.relative('uploads/', optimizedPath)}`;
    req.file.dimensions = {
      width: metadata.width,
      height: metadata.height
    };

    next();

  } catch (error) {
    console.error('Image processing error:', error);
    next(error);
  }
};

/**
 * Middleware สำหรับประมวลผลไฟล์หลายไฟล์
 */
const processMultipleFiles = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    // ประมวลผลแต่ละไฟล์
    const processedFiles = await Promise.all(
      req.files.map(async (file) => {
        const fileData = {
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: `/uploads/${path.relative('uploads/', file.path)}`,
          type: getFileType(file.mimetype)
        };

        // ประมวลผลรูปภาพ
        if (ALLOWED_FILE_TYPES.image.includes(file.mimetype)) {
          try {
            const inputPath = file.path;
            const nameWithoutExt = path.parse(file.filename).name;
            const outputDir = path.dirname(inputPath);

            // สร้าง thumbnail
            const thumbnailPath = path.join(outputDir, `thumb-${nameWithoutExt}.webp`);
            await sharp(inputPath)
              .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 80 })
              .toFile(thumbnailPath);

            // Get image metadata
            const metadata = await sharp(inputPath).metadata();

            fileData.thumbnail = `/uploads/${path.relative('uploads/', thumbnailPath)}`;
            fileData.dimensions = {
              width: metadata.width,
              height: metadata.height
            };

          } catch (imageError) {
            console.error('Image processing error for', file.filename, ':', imageError);
          }
        }

        return fileData;
      })
    );

    req.processedFiles = processedFiles;
    next();

  } catch (error) {
    console.error('Multiple files processing error:', error);
    next(error);
  }
};

/**
 * Middleware สำหรับลบไฟล์เก่า
 */
const cleanupOldFiles = (maxAge = 24 * 60 * 60 * 1000) => {
  return async (req, res, next) => {
    try {
      const uploadsDir = 'uploads/';
      const now = Date.now();

      // หาไฟล์ที่เก่ากว่า maxAge
      const files = await fs.readdir(uploadsDir, { recursive: true });
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old file: ${filePath}`);
        }
      }

    } catch (error) {
      console.error('File cleanup error:', error);
    }

    next();
  };
};

/**
 * Error handler สำหรับ multer
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
    }

    return res.status(400).json({
      success: false,
      message: message,
      error: error.message
    });
  }

  if (error.message.includes('File type') || error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: 'File type not allowed',
      error: error.message
    });
  }

  next(error);
};

/**
 * Utility function สำหรับลบไฟล์
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(path.join('uploads/', filePath));
    return true;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
};

module.exports = {
  uploadChatFile,
  uploadAvatar,
  processImage,
  processMultipleFiles,
  cleanupOldFiles,
  handleUploadError,
  deleteFile,
  getFileType,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES
};