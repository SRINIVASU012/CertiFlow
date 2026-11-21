import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

let ioInstance = null;

export const initSocket = (httpServer) => {
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

  ioInstance = new Server(httpServer, {
    cors: {
      origin: [allowedOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket Authentication Middleware
  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // Allow unauthenticated connection for public certificate status room if needed
      socket.user = null;
      return next();
    }

    try {
      const secret = process.env.JWT_SECRET || 'certiflow_super_secret_jwt_key_pragati_skills_2026';
      const decoded = jwt.verify(token, secret);
      socket.user = decoded;
      return next();
    } catch (err) {
      // Invalid token - keep socket unauthenticated
      socket.user = null;
      return next();
    }
  });

  ioInstance.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user?.email || 'Anonymous'})`);

    if (socket.user) {
      // Join role room (e.g. "role:TRAINING_CENTRE", "role:DISTRICT_OFFICER", "role:STATE_OFFICE")
      socket.join(`role:${socket.user.role}`);
      // Join individual user room
      socket.join(`user:${socket.user.id}`);
    }

    // Allow joining specific batch room
    socket.on('join_batch', (batchId) => {
      if (batchId) {
        socket.join(`batch:${batchId}`);
      }
    });

    socket.on('leave_batch', (batchId) => {
      if (batchId) {
        socket.leave(`batch:${batchId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};

/**
 * Emit an event safely to targeted rooms
 */
export const emitEvent = (room, event, data) => {
  if (ioInstance) {
    if (room) {
      ioInstance.to(room).emit(event, data);
    } else {
      ioInstance.emit(event, data);
    }
  }
};
