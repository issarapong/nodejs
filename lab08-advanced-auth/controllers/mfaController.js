/**
 * MFA Controller - Multi-Factor Authentication
 * คอนโทรลเลอร์สำหรับจัดการ Multi-Factor Authentication
 */

const User = require('../models/User');
const qrcode = require('qrcode');
const speakeasy = require('speakeasy');
const { validationResult } = require('express-validator');

class MFAController {
  
  /**
   * เปิดใช้งาน MFA - สร้าง Secret และ QR Code
   */
  async enableMFA(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (user.mfaEnabled) {
        return res.status(400).json({
          success: false,
          message: 'MFA ถูกเปิดใช้งานอยู่แล้ว'
        });
      }
      
      // สร้าง MFA secret
      const secret = user.generateMFASecret();
      
      // บันทึก secret ชั่วคราว (ยังไม่เปิดใช้งานจริง)
      user.mfaSecret = secret.base32;
      await user.save();
      
      // สร้าง QR Code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
      
      res.status(200).json({
        success: true,
        message: 'สร้าง MFA Secret สำเร็จ กรุณาสแกน QR Code ด้วยแอพ Authenticator',
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          manualEntryKey: secret.base32,
          instructions: [
            '1. ติดตั้งแอพ Google Authenticator หรือ Authy',
            '2. สแกน QR Code หรือใส่ Manual Entry Key',
            '3. กรอกรหัส 6 หลักที่แสดงในแอพเพื่อยืนยัน'
          ]
        }
      });
      
    } catch (error) {
      console.error('Enable MFA Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเปิดใช้งาน MFA'
      });
    }
  }
  
  /**
   * ยืนยันการตั้งค่า MFA
   */
  async verifyMFASetup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }
      
      const { token } = req.body;
      const user = await User.findById(req.user.id);
      
      if (!user.mfaSecret) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบ MFA Secret กรุณาเริ่มการตั้งค่าใหม่'
        });
      }
      
      // ตรวจสอบ MFA token
      const isValid = user.verifyMFAToken(token);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'รหัส MFA ไม่ถูกต้อง'
        });
      }
      
      // เปิดใช้งาน MFA และสร้าง backup codes
      user.mfaEnabled = true;
      const backupCodes = user.generateMFABackupCodes();
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'เปิดใช้งาน MFA สำเร็จ',
        data: {
          backupCodes,
          instructions: [
            'เก็บรหัสสำรองเหล่านี้ในที่ปลอดภัย',
            'รหัสแต่ละตัวใช้ได้เพียงครั้งเดียว',
            'ใช้เมื่อไม่สามารถเข้าถึงแอพ Authenticator ได้'
          ]
        }
      });
      
    } catch (error) {
      console.error('Verify MFA Setup Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยืนยัน MFA'
      });
    }
  }
  
  /**
   * ปิดใช้งาน MFA
   */
  async disableMFA(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }
      
      const { password, mfaToken } = req.body;
      const user = await User.findById(req.user.id).select('+password');
      
      if (!user.mfaEnabled) {
        return res.status(400).json({
          success: false,
          message: 'MFA ไม่ได้เปิดใช้งาน'
        });
      }
      
      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'รหัสผ่านไม่ถูกต้อง'
        });
      }
      
      // ตรวจสอบ MFA token
      const isMFAValid = user.verifyMFAToken(mfaToken);
      if (!isMFAValid) {
        return res.status(400).json({
          success: false,
          message: 'รหัส MFA ไม่ถูกต้อง'
        });
      }
      
      // ปิดใช้งาน MFA
      user.mfaEnabled = false;
      user.mfaSecret = undefined;
      user.mfaBackupCodes = [];
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'ปิดใช้งาน MFA สำเร็จ'
      });
      
    } catch (error) {
      console.error('Disable MFA Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการปิดใช้งาน MFA'
      });
    }
  }
  
  /**
   * สร้าง Backup Codes ใหม่
   */
  async regenerateBackupCodes(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: errors.array()
        });
      }
      
      const { password, mfaToken } = req.body;
      const user = await User.findById(req.user.id).select('+password');
      
      if (!user.mfaEnabled) {
        return res.status(400).json({
          success: false,
          message: 'MFA ไม่ได้เปิดใช้งาน'
        });
      }
      
      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'รหัสผ่านไม่ถูกต้อง'
        });
      }
      
      // ตรวจสอบ MFA token
      const isMFAValid = user.verifyMFAToken(mfaToken);
      if (!isMFAValid) {
        return res.status(400).json({
          success: false,
          message: 'รหัส MFA ไม่ถูกต้อง'
        });
      }
      
      // สร้าง backup codes ใหม่
      const backupCodes = user.generateMFABackupCodes();
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'สร้างรหัสสำรองใหม่สำเร็จ',
        data: {
          backupCodes,
          warning: 'รหัสสำรองเก่าจะไม่สามารถใช้ได้อีกต่อไป'
        }
      });
      
    } catch (error) {
      console.error('Regenerate Backup Codes Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างรหัสสำรอง'
      });
    }
  }
  
  /**
   * ดูสถานะ MFA
   */
  async getMFAStatus(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      const backupCodesRemaining = user.mfaBackupCodes 
        ? user.mfaBackupCodes.filter(code => !code.used).length 
        : 0;
      
      res.status(200).json({
        success: true,
        data: {
          mfaEnabled: user.mfaEnabled,
          backupCodesRemaining,
          recommendations: user.mfaEnabled 
            ? [
                backupCodesRemaining < 3 ? 'แนะนำให้สร้างรหัสสำรองใหม่' : null,
                'ควรเก็บรหัสสำรองในที่ปลอดภัย',
                'ตรวจสอบแอพ Authenticator เป็นประจำ'
              ].filter(Boolean)
            : [
                'แนะนำให้เปิดใช้งาน MFA เพื่อความปลอดภัย',
                'MFA ช่วยป้องกันการเข้าถึงบัญชีโดยไม่ได้รับอนุญาต'
              ]
        }
      });
      
    } catch (error) {
      console.error('Get MFA Status Error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถานะ MFA'
      });
    }
  }
}

module.exports = new MFAController();