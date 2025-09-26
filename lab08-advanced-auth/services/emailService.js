/**
 * Services - Email Service
 * บริการสำหรับส่งอีเมล
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }
  
  /**
   * สร้าง Email Transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true สำหรับ port 465, false สำหรับ port อื่นๆ
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // ทดสอบการเชื่อมต่อ
      this.verifyConnection();
      
    } catch (error) {
      console.error('❌ ไม่สามารถสร้าง Email Transporter:', error);
    }
  }
  
  /**
   * ทดสอบการเชื่อมต่อ
   */
  async verifyConnection() {
    if (!this.transporter) return false;
    
    try {
      await this.transporter.verify();
      console.log('✅ Email service พร้อมใช้งาน');
      return true;
    } catch (error) {
      console.error('❌ Email service ไม่พร้อมใช้งาน:', error.message);
      return false;
    }
  }
  
  /**
   * ส่งอีเมลยืนยันการสมัครสมาชิก
   */
  async sendEmailVerification(email, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
    
    const mailOptions = {
      from: {
        name: 'NodeJS Lab - Advanced Auth',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔐 ยืนยันการสมัครสมาชิก - NodeJS Lab',
      html: this.getEmailVerificationTemplate(verificationUrl),
      text: `
กรุณายืนยันการสมัครสมาชิกโดยคลิกลิงก์ด้านล่าง:
${verificationUrl}

หากคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยต่ออีเมลนี้

ขอบคุณ,
NodeJS Lab Team
      `.trim()
    };
    
    return await this.sendEmail(mailOptions);
  }
  
  /**
   * ส่งอีเมลรีเซ็ตรหัสผ่าน
   */
  async sendPasswordReset(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: {
        name: 'NodeJS Lab - Advanced Auth',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔑 รีเซ็ตรหัสผ่าน - NodeJS Lab',
      html: this.getPasswordResetTemplate(resetUrl),
      text: `
คุณได้ขอรีเซ็ตรหัสผ่าน กรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:
${resetUrl}

ลิงก์นี้จะหมดอายุภายใน 10 นาที

หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้

ขอบคุณ,
NodeJS Lab Team
      `.trim()
    };
    
    return await this.sendEmail(mailOptions);
  }
  
  /**
   * ส่งอีเมลแจ้งเตือนการเปลี่ยนรหัสผ่าน
   */
  async sendPasswordChangeNotification(email) {
    const mailOptions = {
      from: {
        name: 'NodeJS Lab - Advanced Auth',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔒 รหัสผ่านถูกเปลี่ยนแล้ว - NodeJS Lab',
      html: this.getPasswordChangeTemplate(),
      text: `
รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว

เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}

หากคุณไม่ได้เปลี่ยนรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบทันที

ขอบคุณ,
NodeJS Lab Team
      `.trim()
    };
    
    return await this.sendEmail(mailOptions);
  }
  
  /**
   * ส่งอีเมลแจ้งเตือนการเข้าสู่ระบบจากอุปกรณ์ใหม่
   */
  async sendNewDeviceAlert(email, deviceInfo) {
    const mailOptions = {
      from: {
        name: 'NodeJS Lab - Advanced Auth',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🚨 การเข้าสู่ระบบจากอุปกรณ์ใหม่ - NodeJS Lab',
      html: this.getNewDeviceAlertTemplate(deviceInfo),
      text: `
มีการเข้าสู่ระบบจากอุปกรณ์ใหม่:

อุปกรณ์: ${deviceInfo.name}
ระบบปฏิบัติการ: ${deviceInfo.os}
เบราว์เซอร์: ${deviceInfo.browser}
ตำแหน่ง: ${deviceInfo.location.city}, ${deviceInfo.location.country}
IP Address: ${deviceInfo.ipAddress}
เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}

หากคุณไม่ได้เข้าสู่ระบบ กรุณาเปลี่ยนรหัสผ่านทันที

ขอบคุณ,
NodeJS Lab Team
      `.trim()
    };
    
    return await this.sendEmail(mailOptions);
  }
  
  /**
   * ส่งอีเมลรหัส MFA Backup Codes
   */
  async sendMFABackupCodes(email, backupCodes) {
    const mailOptions = {
      from: {
        name: 'NodeJS Lab - Advanced Auth',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔐 รหัสสำรอง MFA - NodeJS Lab',
      html: this.getMFABackupCodesTemplate(backupCodes),
      text: `
รหัสสำรอง MFA ของคุณ:

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

กรุณาเก็บรหัสเหล่านี้ในที่ปลอดภัย
รหัสแต่ละตัวใช้ได้เพียงครั้งเดียว
ใช้เมื่อไม่สามารถเข้าถึงแอพ Authenticator ได้

ขอบคุณ,
NodeJS Lab Team
      `.trim()
    };
    
    return await this.sendEmail(mailOptions);
  }
  
  /**
   * ส่งอีเมลรายงานการเข้าสู่ระบบ (รายสัปดาห์)
   */
  async sendWeeklyLoginReport(email, loginStats) {
    const mailOptions = {
      from: {
        name: 'NodeJS Lab - Advanced Auth',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '📊 รายงานการเข้าสู่ระบบรายสัปดาห์ - NodeJS Lab',
      html: this.getWeeklyReportTemplate(loginStats),
      text: `
รายงานการเข้าสู่ระบบสัปดาห์นี้:

• การเข้าสู่ระบบทั้งหมด: ${loginStats.totalLogins} ครั้ง
• อุปกรณ์ที่ใช้: ${loginStats.uniqueDevices} อุปกรณ์
• ตำแหน่งที่เข้าถึง: ${loginStats.uniqueLocations} ที่
• การเข้าสู่ระบบที่ล้มเหลว: ${loginStats.failedAttempts} ครั้ง

หากพบกิจกรรมที่น่าสงสัย กรุณาติดต่อผู้ดูแลระบบ

ขอบคุณ,
NodeJS Lab Team
      `.trim()
    };
    
    return await this.sendEmail(mailOptions);
  }
  
  /**
   * ส่งอีเมลทั่วไป
   */
  async sendEmail(mailOptions) {
    if (!this.transporter) {
      throw new Error('Email transporter ไม่พร้อมใช้งาน');
    }
    
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ ส่งอีเมลสำเร็จ:', info.messageId);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ ส่งอีเมลไม่สำเร็จ:', error);
      throw error;
    }
  }
  
  /**
   * Template สำหรับอีเมลยืนยัน
   */
  getEmailVerificationTemplate(verificationUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ยืนยันการสมัครสมาชิก</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 ยืนยันการสมัครสมาชิก</h1>
        </div>
        <div class="content">
            <h2>ยินดีต้อนรับสู่ NodeJS Lab!</h2>
            <p>กรุณาคลิกปุ่มด้านล่างเพื่อยืนยันการสมัครสมาชิก:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">ยืนยันการสมัครสมาชิก</a>
            </p>
            <p>หรือคัดลอกลิงก์นี้ไปใส่ในเบราว์เซอร์:</p>
            <p><code>${verificationUrl}</code></p>
            <p><strong>หมายเหตุ:</strong> ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง</p>
        </div>
        <div class="footer">
            <p>หากคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยต่ออีเมลนี้</p>
            <p>© 2024 NodeJS Lab - Advanced Authentication</p>
        </div>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Template สำหรับรีเซ็ตรหัสผ่าน
   */
  getPasswordResetTemplate(resetUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>รีเซ็ตรหัสผ่าน</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 รีเซ็ตรหัสผ่าน</h1>
        </div>
        <div class="content">
            <h2>คำขอรีเซ็ตรหัสผ่าน</h2>
            <p>คุณได้ขอรีเซ็ตรหัสผ่าน กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">รีเซ็ตรหัสผ่าน</a>
            </p>
            <p>หรือคัดลอกลิงก์นี้ไปใส่ในเบราว์เซอร์:</p>
            <p><code>${resetUrl}</code></p>
            <p><strong>หมายเหตุ:</strong> ลิงก์นี้จะหมดอายุภายใน 10 นาที</p>
        </div>
        <div class="footer">
            <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>
            <p>© 2024 NodeJS Lab - Advanced Authentication</p>
        </div>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Template สำหรับแจ้งเตือนการเปลี่ยนรหัสผ่าน
   */
  getPasswordChangeTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>รหัสผ่านถูกเปลี่ยนแล้ว</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 รหัสผ่านถูกเปลี่ยนแล้ว</h1>
        </div>
        <div class="content">
            <h2>การเปลี่ยนรหัสผ่านสำเร็จ</h2>
            <p>รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว</p>
            <p><strong>เวลา:</strong> ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>⚠️ หากคุณไม่ได้เปลี่ยนรหัสผ่าน:</strong></p>
                <p>กรุณาติดต่อผู้ดูแลระบบทันที เนื่องจากบัญชีของคุณอาจถูกเข้าถึงโดยไม่ได้รับอนุญาต</p>
            </div>
        </div>
        <div class="footer">
            <p>© 2024 NodeJS Lab - Advanced Authentication</p>
        </div>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Template สำหรับแจ้งเตือนอุปกรณ์ใหม่
   */
  getNewDeviceAlertTemplate(deviceInfo) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>การเข้าสู่ระบบจากอุปกรณ์ใหม่</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ffc107; color: #333; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .device-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 การเข้าสู่ระบบจากอุปกรณ์ใหม่</h1>
        </div>
        <div class="content">
            <h2>ตรวจพบการเข้าสู่ระบบใหม่</h2>
            <p>มีการเข้าสู่ระบบบัญชีของคุณจากอุปกรณ์ใหม่:</p>
            <div class="device-info">
                <p><strong>📱 อุปกรณ์:</strong> ${deviceInfo.name}</p>
                <p><strong>💻 ระบบปฏิบัติการ:</strong> ${deviceInfo.os}</p>
                <p><strong>🌐 เบราว์เซอร์:</strong> ${deviceInfo.browser}</p>
                <p><strong>📍 ตำแหน่ง:</strong> ${deviceInfo.location.city}, ${deviceInfo.location.country}</p>
                <p><strong>🌐 IP Address:</strong> ${deviceInfo.ipAddress}</p>
                <p><strong>⏰ เวลา:</strong> ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
            </div>
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>⚠️ หากคุณไม่ได้เข้าสู่ระบบ:</strong></p>
                <ul>
                    <li>เปลี่ยนรหัสผ่านทันที</li>
                    <li>ตรวจสอบกิจกรรมการเข้าสู่ระบบ</li>
                    <li>เปิดใช้งาน MFA หากยังไม่ได้เปิด</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p>© 2024 NodeJS Lab - Advanced Authentication</p>
        </div>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Template สำหรับ MFA Backup Codes
   */
  getMFABackupCodesTemplate(backupCodes) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>รหัสสำรอง MFA</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .codes { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; font-family: monospace; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 รหัสสำรอง MFA</h1>
        </div>
        <div class="content">
            <h2>รหัสสำรองสำหรับ Multi-Factor Authentication</h2>
            <p>รหัสสำรอง MFA ของคุณ:</p>
            <div class="codes">
                ${backupCodes.map((code, index) => `<p>${index + 1}. <strong>${code}</strong></p>`).join('')}
            </div>
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>📝 คำแนะนำ:</strong></p>
                <ul>
                    <li>เก็บรหัสเหล่านี้ในที่ปลอดภัย</li>
                    <li>รหัสแต่ละตัวใช้ได้เพียงครั้งเดียว</li>
                    <li>ใช้เมื่อไม่สามารถเข้าถึงแอพ Authenticator ได้</li>
                    <li>หากใช้หมดแล้ว สามารถสร้างใหม่ได้</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p>© 2024 NodeJS Lab - Advanced Authentication</p>
        </div>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Template สำหรับรายงานรายสัปดาห์
   */
  getWeeklyReportTemplate(loginStats) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>รายงานการเข้าสู่ระบบรายสัปดาห์</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .stats { display: flex; justify-content: space-between; margin: 20px 0; }
        .stat-box { background: white; padding: 15px; border-radius: 5px; text-align: center; flex: 1; margin: 0 5px; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 รายงานการเข้าสู่ระบบรายสัปดาห์</h1>
        </div>
        <div class="content">
            <h2>สรุปกิจกรรมสัปดาห์นี้</h2>
            <div class="stats">
                <div class="stat-box">
                    <h3>${loginStats.totalLogins}</h3>
                    <p>การเข้าสู่ระบบ</p>
                </div>
                <div class="stat-box">
                    <h3>${loginStats.uniqueDevices}</h3>
                    <p>อุปกรณ์ที่ใช้</p>
                </div>
                <div class="stat-box">
                    <h3>${loginStats.uniqueLocations}</h3>
                    <p>ตำแหน่งต่างๆ</p>
                </div>
            </div>
            <div style="background: ${loginStats.failedAttempts > 10 ? '#f8d7da' : '#d4edda'}; border: 1px solid ${loginStats.failedAttempts > 10 ? '#f5c6cb' : '#c3e6cb'}; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>🚨 การเข้าสู่ระบบที่ล้มเหลว:</strong> ${loginStats.failedAttempts} ครั้ง</p>
                ${loginStats.failedAttempts > 10 ? '<p>จำนวนการพยายามเข้าสู่ระบบที่ล้มเหลวสูงกว่าปกติ กรุณาตรวจสอบ</p>' : ''}
            </div>
        </div>
        <div class="footer">
            <p>หากพบกิจกรรมที่น่าสงสัย กรุณาติดต่อผู้ดูแลระบบ</p>
            <p>© 2024 NodeJS Lab - Advanced Authentication</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

module.exports = new EmailService();