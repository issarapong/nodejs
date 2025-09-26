/**
 * Services - Device Management
 * บริการสำหรับจัดการข้อมูลอุปกรณ์
 */

const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const crypto = require('crypto');

class DeviceService {
  
  /**
   * แยกข้อมูลอุปกรณ์จาก User Agent
   */
  parseDeviceInfo(userAgent, ipAddress) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    // ดึงข้อมูลตำแหน่งจาก IP
    const location = this.getLocationFromIP(ipAddress);
    
    // สร้าง Device ID แบบ unique
    const deviceId = this.generateDeviceId(userAgent, ipAddress);
    
    return {
      deviceId,
      name: this.getDeviceName(result),
      type: this.getDeviceType(result),
      os: result.os.name && result.os.version 
        ? `${result.os.name} ${result.os.version}` 
        : 'Unknown OS',
      browser: result.browser.name && result.browser.version 
        ? `${result.browser.name} ${result.browser.version}` 
        : 'Unknown Browser',
      userAgent,
      ipAddress,
      location
    };
  }
  
  /**
   * สร้างชื่ออุปกรณ์ที่เข้าใจง่าย
   */
  getDeviceName(result) {
    const { device, browser, os } = result;
    
    // มือถือ
    if (device.type === 'mobile') {
      return `${device.vendor || 'Unknown'} ${device.model || 'Mobile'} (${browser.name || 'Browser'})`;
    }
    
    // แท็บเล็ต
    if (device.type === 'tablet') {
      return `${device.vendor || 'Unknown'} ${device.model || 'Tablet'} (${browser.name || 'Browser'})`;
    }
    
    // คอมพิวเตอร์
    if (os.name) {
      return `${os.name} Computer (${browser.name || 'Browser'})`;
    }
    
    // ไม่ทราบ
    return `Unknown Device (${browser.name || 'Unknown Browser'})`;
  }
  
  /**
   * กำหนดประเภทอุปกรณ์
   */
  getDeviceType(result) {
    const { device } = result;
    
    if (device.type === 'mobile') return 'mobile';
    if (device.type === 'tablet') return 'tablet';
    if (device.type === 'smarttv') return 'tv';
    if (device.type === 'wearable') return 'wearable';
    if (device.type === 'embedded') return 'embedded';
    
    // ถ้าไม่มีข้อมูล device.type แสดงว่าเป็น desktop/laptop
    return 'desktop';
  }
  
  /**
   * ดึงข้อมูลตำแหน่งจาก IP Address
   */
  getLocationFromIP(ipAddress) {
    // ถ้าเป็น local IP ให้ข้ามไป
    if (this.isPrivateIP(ipAddress) || ipAddress === '::1' || ipAddress === '127.0.0.1') {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local',
        timezone: 'Asia/Bangkok'
      };
    }
    
    try {
      const geo = geoip.lookup(ipAddress);
      if (geo) {
        return {
          country: geo.country || 'Unknown',
          region: geo.region || 'Unknown',
          city: geo.city || 'Unknown',
          timezone: geo.timezone || 'UTC'
        };
      }
    } catch (error) {
      console.error('GeoIP lookup error:', error);
    }
    
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'UTC'
    };
  }
  
  /**
   * สร้าง Device ID ที่ไม่ซ้ำ
   */
  generateDeviceId(userAgent, ipAddress) {
    // รวมข้อมูลที่ไม่เปลี่ยนแปลงบ่อย
    const deviceFingerprint = [
      userAgent,
      ipAddress,
      Date.now().toString().slice(0, -3) // ลบ 3 หลักท้าย เพื่อให้ไม่เปลี่ยนทุกวินาที
    ].join('|');
    
    return crypto
      .createHash('sha256')
      .update(deviceFingerprint)
      .digest('hex')
      .substring(0, 16); // ใช้ 16 ตัวอักษรแรก
  }
  
  /**
   * ตรวจสอบว่าเป็น Private IP หรือไม่
   */
  isPrivateIP(ip) {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^fc00:/, // IPv6 private
      /^fe80:/ // IPv6 link-local
    ];
    
    return privateRanges.some(range => range.test(ip));
  }
  
  /**
   * ตรวจสอบว่าอุปกรณ์น่าเชื่อถือหรือไม่
   */
  isTrustedDevice(deviceInfo, userDevices = []) {
    // ค้นหาจากอุปกรณ์ที่เคยใช้
    const existingDevice = userDevices.find(device => 
      device.deviceId === deviceInfo.deviceId
    );
    
    if (existingDevice) {
      return existingDevice.trusted;
    }
    
    return false; // อุปกรณ์ใหม่ถือว่าไม่น่าเชื่อถือ
  }
  
  /**
   * วิเคราะห์ความเสี่ยงของอุปกรณ์
   */
  analyzeDeviceRisk(deviceInfo, userProfile = {}) {
    let riskScore = 0;
    const riskFactors = [];
    
    // 1. ตรวจสอบตำแหน่ง
    if (userProfile.lastKnownLocation) {
      if (deviceInfo.location.country !== userProfile.lastKnownLocation.country) {
        riskScore += 30;
        riskFactors.push('เข้าสู่ระบบจากประเทศที่แตกต่าง');
      }
    }
    
    // 2. ตรวจสอบเบราว์เซอร์/OS ที่ไม่คุ้นเคย
    const commonBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    if (!commonBrowsers.some(browser => deviceInfo.browser.includes(browser))) {
      riskScore += 15;
      riskFactors.push('ใช้เบราว์เซอร์ที่ไม่แพร่หลาย');
    }
    
    // 3. ตรวจสอบเวลาเข้าสู่ระบบ (ถ้ามีข้อมูลเก่า)
    const currentHour = new Date().getHours();
    if (userProfile.usualLoginHours) {
      const isUsualTime = userProfile.usualLoginHours.includes(currentHour);
      if (!isUsualTime) {
        riskScore += 10;
        riskFactors.push('เข้าสู่ระบบในเวลาที่ไม่ปกติ');
      }
    }
    
    // 4. ตรวจสอบประเภทอุปกรณ์
    if (deviceInfo.type === 'mobile' && userProfile.primaryDeviceType === 'desktop') {
      riskScore += 5;
      riskFactors.push('เปลี่ยนประเภทอุปกรณ์');
    }
    
    // กำหนดระดับความเสี่ยง
    let riskLevel = 'low';
    if (riskScore >= 40) {
      riskLevel = 'high';
    } else if (riskScore >= 20) {
      riskLevel = 'medium';
    }
    
    return {
      riskScore,
      riskLevel,
      riskFactors,
      recommendations: this.getRiskRecommendations(riskLevel)
    };
  }
  
  /**
   * แนะนำการป้องกันตามระดับความเสี่ยง
   */
  getRiskRecommendations(riskLevel) {
    const recommendations = {
      low: [
        'อุปกรณ์นี้ดูปลอดภัย',
        'แนะนำให้เปิดใช้งาน MFA สำหรับความปลอดภัยเพิ่มเติม'
      ],
      medium: [
        'อุปกรณ์นี้มีความเสี่ยงปานกลาง',
        'แนะนำให้ใช้ MFA',
        'ตรวจสอบการเข้าสู่ระบบเป็นประจำ'
      ],
      high: [
        'อุปกรณ์นี้มีความเสี่ยงสูง',
        'บังคับใช้ MFA',
        'พิจารณาเปลี่ยนรหัสผ่าน',
        'ตรวจสอบกิจกรรมการเข้าสู่ระบบทั้งหมด'
      ]
    };
    
    return recommendations[riskLevel] || recommendations.low;
  }
  
  /**
   * สร้างข้อมูลสรุปอุปกรณ์สำหรับผู้ใช้
   */
  generateDeviceSummary(devices) {
    const summary = {
      totalDevices: devices.length,
      deviceTypes: {},
      browsers: {},
      operatingSystems: {},
      locations: {},
      lastUsed: null,
      oldestDevice: null
    };
    
    devices.forEach(device => {
      // นับประเภทอุปกรณ์
      summary.deviceTypes[device.deviceInfo.type] = 
        (summary.deviceTypes[device.deviceInfo.type] || 0) + 1;
      
      // นับเบราว์เซอร์
      const browserName = device.deviceInfo.browser.split(' ')[0];
      summary.browsers[browserName] = 
        (summary.browsers[browserName] || 0) + 1;
      
      // นับระบบปฏิบัติการ
      const osName = device.deviceInfo.os.split(' ')[0];
      summary.operatingSystems[osName] = 
        (summary.operatingSystems[osName] || 0) + 1;
      
      // นับตำแหน่ง
      const location = `${device.location.city}, ${device.location.country}`;
      summary.locations[location] = 
        (summary.locations[location] || 0) + 1;
      
      // หาการใช้งานล่าสุด
      if (!summary.lastUsed || device.lastUsed > summary.lastUsed) {
        summary.lastUsed = device.lastUsed;
      }
      
      // หาอุปกรณ์เก่าที่สุด
      if (!summary.oldestDevice || device.createdAt < summary.oldestDevice) {
        summary.oldestDevice = device.createdAt;
      }
    });
    
    return summary;
  }
}

module.exports = new DeviceService();