# Lab 9: WebSocket & Real-time Features
## การเขียน Node.js แบบ Real-time Communication

### 🎯 เป้าหมายของ Lab
ในแลปนี้จะเรียนรู้การสร้างแอพพลิเคชั่น Real-time ด้วย WebSocket, Socket.io และคุณสมบัติต่างๆ:

1. **WebSocket Basic** - การเชื่อมต่อ WebSocket พื้นฐาน
2. **Socket.io Integration** - ใช้ Socket.io สำหรับ real-time communication
3. **Real-time Chat** - ระบบแชทแบบ real-time
4. **Live Notifications** - การแจ้งเตือนแบบ real-time
5. **Real-time Dashboard** - dashboard ที่อัพเดทแบบ real-time
6. **Room & Namespace** - จัดการกลุ่มผู้ใช้
7. **Authentication with Socket** - การยืนยันตัวตนใน WebSocket
8. **Broadcasting** - ส่งข้อความแบบ broadcast
9. **File Sharing** - แชร์ไฟล์แบบ real-time
10. **Performance Monitoring** - ติดตาม performance แบบ real-time

### 🛠 เทคโนโลยีที่ใช้
- **Socket.io** - Real-time communication library
- **WebSocket** - WebSocket protocol
- **Express.js** - Web framework
- **Redis** - Session store และ pub/sub
- **MongoDB** - เก็บข้อมูลแชทและ notification
- **JWT** - Authentication
- **Multer** - File upload
- **Chart.js** - Real-time charts
- **HTML5/CSS3/JavaScript** - Frontend

### 📁 โครงสร้างโปรเจค
```
lab09-websocket-realtime/
├── README.md
├── package.json
├── .env.example
├── app.js                    # Express + Socket.io server
├── socket.js                 # Socket.io configuration
├── models/
│   ├── Message.js           # Chat message model
│   ├── Room.js              # Chat room model
│   ├── Notification.js      # Notification model
│   └── User.js              # User model
├── controllers/
│   ├── chatController.js    # Chat API controllers
│   ├── notificationController.js
│   └── dashboardController.js
├── middleware/
│   ├── socketAuth.js        # Socket authentication
│   └── upload.js            # File upload middleware
├── routes/
│   ├── chat.js              # Chat API routes
│   ├── notifications.js     # Notification routes
│   └── dashboard.js         # Dashboard routes
├── sockets/
│   ├── chatSocket.js        # Chat socket handlers
│   ├── notificationSocket.js
│   └── dashboardSocket.js
├── public/
│   ├── index.html           # หน้าแรก
│   ├── chat.html            # Chat interface
│   ├── dashboard.html       # Real-time dashboard
│   ├── css/
│   │   └── style.css        # Styles
│   └── js/
│       ├── chat.js          # Chat client
│       ├── dashboard.js     # Dashboard client
│       └── notifications.js # Notification client
├── config/
│   ├── database.js          # MongoDB connection
│   └── redis.js             # Redis connection
└── utils/
    ├── seed.js              # Sample data
    └── logger.js            # Logging utility
```

### 🚀 การติดตั้งและใช้งาน

#### 1. ติดตั้ง Dependencies
```bash
npm install
```

#### 2. ตั้งค่า Environment Variables
```bash
cp .env.example .env
# แก้ไข .env ตามต้องการ
```

#### 3. เริ่มต้น MongoDB และ Redis
```bash
# MongoDB (Docker)
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Redis (Docker)
docker run -d --name redis -p 6379:6379 redis:latest
```

#### 4. เพิ่มข้อมูลตัวอย่าง
```bash
npm run seed
```

#### 5. เริ่มเซิร์ฟเวอร์
```bash
npm start
# หรือ
npm run dev  # สำหรับ development (auto-restart)
```

#### 6. เปิดเว็บเบราว์เซอร์
```
http://localhost:3000        # หน้าแรก
http://localhost:3000/chat   # Real-time Chat
http://localhost:3000/dashboard # Real-time Dashboard
```

### 📋 คุณสมบัติหลัก

#### 🗨️ Real-time Chat
- **Private Chat** - แชทส่วนตัว 1:1
- **Group Chat** - แชทกลุ่ม
- **Room Management** - สร้าง/เข้า/ออกจากห้อง
- **Message Types** - ข้อความ, รูปภาพ, ไฟล์
- **Typing Indicators** - แสดงสถานะกำลังพิมพ์
- **Message Status** - ส่งแล้ว, อ่านแล้ว
- **Online Status** - สถานะออนไลน์
- **Message History** - ประวัติข้อความ

#### 🔔 Live Notifications
- **Push Notifications** - แจ้งเตือนแบบ push
- **In-app Notifications** - แจ้งเตือนในแอพ
- **Email Notifications** - แจ้งเตือนทางอีเมล
- **Notification Types** - หลายประเภท
- **Notification Center** - ศูนย์แจ้งเตือน
- **Mark as Read** - ทำเครื่องหมายอ่านแล้ว

#### 📊 Real-time Dashboard
- **Live Metrics** - ตัวชี้วัดแบบ live
- **Real-time Charts** - กราฟแบบ real-time
- **System Monitoring** - ติดตามระบบ
- **User Activity** - กิจกรรมผู้ใช้
- **Performance Stats** - สถิติประสิทธิภาพ
- **Auto Refresh** - อัพเดทอัตโนมัติ

#### 🔐 Authentication & Authorization
- **JWT Integration** - ใช้ JWT สำหรับ WebSocket
- **Socket Authentication** - ยืนยันตัวตน socket
- **Room Permissions** - สิทธิ์ในห้อง
- **User Roles** - บทบาทผู้ใช้
- **Access Control** - ควบคุมการเข้าถึง

### 🌐 Socket.io Events

#### Chat Events
```javascript
// Client -> Server
socket.emit('join_room', { roomId, userId });
socket.emit('leave_room', { roomId, userId });
socket.emit('send_message', { roomId, message, type });
socket.emit('typing_start', { roomId, userId });
socket.emit('typing_stop', { roomId, userId });

// Server -> Client
socket.emit('message_received', message);
socket.emit('user_joined', user);
socket.emit('user_left', user);
socket.emit('typing_indicator', { userId, isTyping });
socket.emit('online_users', users);
```

#### Notification Events
```javascript
// Server -> Client
socket.emit('new_notification', notification);
socket.emit('notification_read', notificationId);
socket.emit('notification_count', count);
```

#### Dashboard Events
```javascript
// Server -> Client
socket.emit('metrics_update', metrics);
socket.emit('chart_data', data);
socket.emit('system_alert', alert);
```

### 🔧 API Endpoints

#### Chat APIs
```bash
GET    /api/chat/rooms          # ดายเอกสารห้องแชท
POST   /api/chat/rooms          # สร้างห้องแชท
GET    /api/chat/rooms/:id      # รายละเอียดห้อง
POST   /api/chat/rooms/:id/join # เข้าห้อง
POST   /api/chat/rooms/:id/leave # ออกจากห้อง
GET    /api/chat/messages/:roomId # ประวัติข้อความ
POST   /api/chat/upload         # อัพโหลดไฟล์
```

#### Notification APIs
```bash
GET    /api/notifications       # ดูแจ้งเตือน
POST   /api/notifications       # สร้างแจ้งเตือน
PUT    /api/notifications/:id/read # ทำเครื่องหมายอ่าน
DELETE /api/notifications/:id   # ลบแจ้งเตือน
GET    /api/notifications/count # จำนวนที่ยังไม่อ่าน
```

#### Dashboard APIs
```bash
GET    /api/dashboard/metrics   # ตัวชี้วัดทั่วไป
GET    /api/dashboard/users     # สถิติผู้ใช้
GET    /api/dashboard/messages  # สถิติข้อความ
GET    /api/dashboard/system    # สถิติระบบ
```

### 📝 ตัวอย่างการใช้งาน

#### 1. เข้าสู่ระบบแชท
```bash
# เปิดเว็บเบราว์เซอร์ไปที่
http://localhost:3000/chat

# หรือใช้ curl ทดสอบ API
curl -X POST "http://localhost:3000/api/chat/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name": "General Chat", "description": "ห้องแชททั่วไป"}'
```

#### 2. ส่งข้อความ
```javascript
// ใน browser console
socket.emit('send_message', {
  roomId: 'room_id_here',
  message: 'สวัสดีครับ!',
  type: 'text'
});
```

#### 3. ดู Dashboard
```bash
# เปิดเว็บเบราว์เซอร์ไปที่
http://localhost:3000/dashboard
```

### 🧪 การทดสอบ

#### ทดสอบ WebSocket Connection
```bash
# ใช้ wscat (ติดตั้ง: npm install -g wscat)
wscat -c ws://localhost:3000/socket.io/

# ใช้ curl ทดสอบ HTTP endpoints
curl "http://localhost:3000/api/chat/rooms" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### ทดสอบแบบ Integration
```bash
npm run test
# หรือ
npm run test:integration
```

### 🎨 Frontend Interface

Lab นี้มาพร้อมกับ **Web Interface** สำหรับทดสอบ:

1. **หน้าแรก** (`/`) - เลือกฟีเจอร์ที่ต้องการทดสอบ
2. **Chat Interface** (`/chat`) - ทดสอบ real-time chat
3. **Dashboard** (`/dashboard`) - ดู real-time metrics
4. **Notifications** - ทดสอบ notification system

### 📊 Performance & Monitoring

- **Connection Tracking** - ติดตามการเชื่อมต่อ
- **Message Throughput** - วัดความเร็วข้อความ
- **Memory Usage** - การใช้หน่วยความจำ
- **Redis Pub/Sub** - ใช้ Redis สำหรับ scaling
- **Load Testing** - ทดสอบภาระงาน

### 🔒 Security Features

- **Rate Limiting** - จำกัดอัตราการส่งข้อความ
- **Input Validation** - ตรวจสอบข้อมูลเข้า
- **XSS Protection** - ป้องกัน XSS
- **File Upload Security** - ความปลอดภัยการอัพโหลด
- **Socket Authentication** - ยืนยันตัวตน WebSocket

### 📚 เทคนิคขั้นสูง

- **Horizontal Scaling** - ขยายแบบ horizontal ด้วย Redis
- **Custom Namespaces** - จัดการ namespace
- **Socket Middleware** - middleware สำหรับ socket
- **Error Handling** - จัดการข้อผิดพลาด
- **Reconnection Logic** - ลอจิกการเชื่อมต่อใหม่

### 🎓 สิ่งที่จะได้เรียนรู้

หลังจากจบ Lab นี้ คุณจะสามารถ:

✅ สร้างแอพพลิเคชั่น Real-time ด้วย Socket.io  
✅ ใช้ WebSocket สำหรับการสื่อสารแบบ bidirectional  
✅ สร้างระบบแชทแบบ real-time  
✅ ทำ Dashboard ที่อัพเดทแบบ real-time  
✅ จัดการ Authentication ใน WebSocket  
✅ ใช้ Redis สำหรับ pub/sub และ scaling  
✅ จัดการ File sharing แบบ real-time  
✅ Optimize performance สำหรับ real-time apps  
✅ ทดสอบแอพพลิเคชั่น real-time  
✅ Deploy แอพพลิเคชั่น real-time  

### 🔗 ความเชื่อมโยงกับ Lab อื่น

Lab นี้เชื่อมโยงกับ:
- **Lab 8** - ใช้ authentication system
- **Lab 10** - Microservices communication
- **Lab 11** - Testing real-time features
- **Lab 12** - Deployment configurations

---

## 🚀 เริ่มต้นใช้งาน

```bash
cd lab09-websocket-realtime
npm install
npm run seed
npm start
```

พร้อมแล้วสำหรับการสร้างแอพพลิเคชั่น **Real-time** สุดล้ำ! 🌟