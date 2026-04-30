require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/services/socketHandlers');
const modeSwitchService = require('./src/services/modeSwitch.service');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = http.createServer(app);
  initSocket(server);
  modeSwitchService.startCronJobs();

  server.listen(PORT, () => {
    console.log(`Bodha LMS server running on port ${PORT}`);
  });
});
