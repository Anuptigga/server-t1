import http from 'http';
import dns from 'node:dns';
import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { Server as SocketServer } from 'socket.io';
import initializeSocket from './config/socket.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.IO (events will be added in later stages)
  const io = new SocketServer(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  // Make io accessible in routes via req.app
  app.set('io', io);

  // Initialize Socket.IO event handlers
  initializeSocket(io);

  // Start listening
  const PORT = env.PORT;
  server.listen(PORT, () => {
    logger.info(`🚀 Rajabhoj server running on port ${PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled rejections
  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();
