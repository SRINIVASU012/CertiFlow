import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { initSocket } from './events/socket.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO with HTTP server
initSocket(server);

server.listen(PORT, () => {
  logger.info(` CertiFlow Backend Server running on port ${PORT}`);
  logger.info(` Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(` Database URL configured: ${process.env.DATABASE_URL ? 'YES' : 'NO'}`);
  logger.info(` Redis Host: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
});

export default server;
