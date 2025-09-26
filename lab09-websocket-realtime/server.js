/**
 * Server Entry Point
 * เริ่มต้นแอปพลิเคชัน
 */

require('dotenv').config();
const App = require('./app');

// สร้างและเริ่มต้นแอปพลิเคชัน
const app = new App();

async function start() {
  try {
    await app.initialize();
    app.start();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();