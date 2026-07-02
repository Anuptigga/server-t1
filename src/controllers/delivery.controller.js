import asyncHandler from '../utils/asyncHandler.js';
import * as deliveryService from '../services/delivery.service.js';

/**
 * PATCH /api/v1/delivery/availability
 * Toggle delivery partner online/offline.
 */
export const toggleAvailability = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await deliveryService.toggleAvailability(req.user._id, isActive);

  res.status(200).json({
    status: 'success',
    message: isActive ? 'You are now online.' : 'You are now offline.',
    data: { user },
  });
});

/**
 * PATCH /api/v1/delivery/location
 * Update delivery partner's live location.
 */
export const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({
      status: 'fail',
      message: 'Latitude and longitude are required.',
    });
  }

  await deliveryService.updateLocation(req.user._id, latitude, longitude);

  res.status(200).json({
    status: 'success',
    message: 'Location updated.',
  });
});

/**
 * GET /api/v1/delivery/available-orders
 * Get orders ready for pickup.
 */
export const getAvailableOrders = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius } = req.query;
  const orders = await deliveryService.getAvailableOrders(
    req.user._id,
    latitude ? parseFloat(latitude) : null,
    longitude ? parseFloat(longitude) : null,
    radius ? parseFloat(radius) : 10
  );

  res.status(200).json({
    status: 'success',
    data: { orders },
  });
});

/**
 * POST /api/v1/delivery/accept/:orderId
 * Accept a delivery order.
 */
export const acceptDelivery = asyncHandler(async (req, res) => {
  const order = await deliveryService.acceptDelivery(
    req.user._id,
    req.params.orderId
  );

  // Notify buyer and kitchen
  const io = req.app.get('io');
  if (io) {
    io.to(`order:${order._id}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
    });
    io.to(`user:${order.buyer._id || order.buyer}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
      orderNumber: order.orderNumber,
      message: 'Your order has been picked up!',
    });
    io.to(`kitchen:${order.kitchen._id || order.kitchen}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Delivery accepted.',
    data: { order },
  });
});

/**
 * POST /api/v1/delivery/pickup/:orderId
 * Mark order as picked up from kitchen.
 */
export const markPickedUp = asyncHandler(async (req, res) => {
  const order = await deliveryService.markPickedUp(
    req.user._id,
    req.params.orderId
  );

  // Notify buyer
  const io = req.app.get('io');
  if (io) {
    io.to(`order:${order._id}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
    });
    io.to(`user:${order.buyer._id || order.buyer}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
      message: 'Your order has been picked up and is on the way!',
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Order marked as picked up.',
    data: { order },
  });
});

/**
 * POST /api/v1/delivery/deliver/:orderId
 * Mark order as delivered.
 */
export const markDelivered = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({
      status: 'fail',
      message: 'Delivery OTP is required.',
    });
  }

  const order = await deliveryService.markDelivered(
    req.user._id,
    req.params.orderId,
    otp
  );

  // Notify buyer
  const io = req.app.get('io');
  if (io) {
    io.to(`order:${order._id}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
    });
    io.to(`user:${order.buyer}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
      message: 'Your order has been delivered!',
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Order delivered!',
    data: { order },
  });
});

/**
 * GET /api/v1/delivery/active
 * Get current active delivery.
 */
export const getActiveDelivery = asyncHandler(async (req, res) => {
  const order = await deliveryService.getActiveDelivery(req.user._id);

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

/**
 * GET /api/v1/delivery/history
 * Get delivery history.
 */
export const getDeliveryHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await deliveryService.getDeliveryHistory(req.user._id, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
  });

  res.status(200).json({
    status: 'success',
    ...result,
  });
});
