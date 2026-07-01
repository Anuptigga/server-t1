import logger from '../utils/logger.js';

/**
 * Initialize Socket.IO event handlers.
 * Rooms:
 * - `user:<userId>` — personal notifications
 * - `kitchen:<kitchenId>` — kitchen order events
 * - `order:<orderId>` — order-specific updates (status, location)
 * - `delivery:available` — available delivery partners listening for new orders
 */
export default function initializeSocket(io) {
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // ====================================
    // Room management
    // ====================================

    /**
     * Join personal room (called after auth on client).
     */
    socket.on('join:user', (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
      logger.debug(`Socket ${socket.id} joined user:${userId}`);
    });

    /**
     * Join kitchen room (for kitchen owners).
     */
    socket.on('join:kitchen', (kitchenId) => {
      if (!kitchenId) return;
      socket.join(`kitchen:${kitchenId}`);
      logger.debug(`Socket ${socket.id} joined kitchen:${kitchenId}`);
    });

    /**
     * Join order room (for tracking a specific order).
     */
    socket.on('join:order', (orderId) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
      logger.debug(`Socket ${socket.id} joined order:${orderId}`);
    });

    socket.on('leave:order', (orderId) => {
      if (!orderId) return;
      socket.leave(`order:${orderId}`);
    });

    /**
     * Delivery partner joins available pool.
     */
    socket.on('delivery:go-online', (userId) => {
      if (!userId) return;
      socket.join('delivery:available');
      socket.join(`user:${userId}`);
      logger.debug(`Delivery partner ${userId} is online`);
    });

    socket.on('delivery:go-offline', () => {
      socket.leave('delivery:available');
    });

    // ====================================
    // Disconnect
    // ====================================
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });
}
