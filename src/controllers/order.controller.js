import asyncHandler from '../utils/asyncHandler.js';
import Kitchen from '../models/Kitchen.js';
import * as orderService from '../services/order.service.js';
import { getRazorpayKeyId } from '../services/payment.service.js';
import AppError from '../utils/AppError.js';

/**
 * POST /api/v1/orders
 * Place a new order (buyer only).
 */
export const placeOrder = asyncHandler(async (req, res) => {
  const { order, paymentOrder } = await orderService.placeOrder(
    req.user._id,
    req.body
  );

  res.status(201).json({
    status: 'success',
    message: 'Order placed successfully.',
    data: {
      order,
      payment: {
        ...paymentOrder,
        keyId: getRazorpayKeyId(),
      },
    },
  });
});

/**
 * POST /api/v1/orders/:id/verify-payment
 * Verify Razorpay payment.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId, signature } = req.body;

  const order = await orderService.verifyOrderPayment(
    req.params.id,
    req.user._id,
    paymentId,
    signature
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`kitchen:${order.kitchen}`).emit('order:new', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      itemCount: order.items.length,
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Payment verified.',
    data: { order },
  });
});

/**
 * PATCH /api/v1/orders/:id/status
 * Update order status (kitchen).
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.params.id,
    req.body.status,
    req.user._id,
    req.body.kitchenNote
  );

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`order:${order._id}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
    });
    io.to(`user:${order.buyer}`).emit('order:status', {
      orderId: order._id,
      status: order.status,
      orderNumber: order.orderNumber,
    });

    // Notify online delivery partners when an order is ready for pickup
    if (order.status === 'ready' && order.deliveryType === 'delivery') {
      io.to('delivery:available').emit('order:ready-for-pickup', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        kitchenId: order.kitchen,
      });
    }
  }

  res.status(200).json({
    status: 'success',
    message: `Order status updated to "${order.status}".`,
    data: { order },
  });
});

/**
 * POST /api/v1/orders/:id/cancel
 * Cancel an order.
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.params.id,
    req.user._id,
    req.user.role,
    req.body.reason
  );

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`kitchen:${order.kitchen}`).emit('order:cancelled', {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
    io.to(`user:${order.buyer}`).emit('order:cancelled', {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Order cancelled.',
    data: { order },
  });
});

/**
 * GET /api/v1/orders/my-orders
 * Get buyer's orders.
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await orderService.getBuyerOrders(req.user._id, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    status,
  });

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * GET /api/v1/orders/kitchen-orders
 * Get kitchen's orders.
 */
export const getKitchenOrders = asyncHandler(async (req, res) => {
  const kitchen = await Kitchen.findOne({ owner: req.user._id });
  if (!kitchen) throw new AppError('No kitchen found.', 404);

  const { page, limit, status } = req.query;
  const result = await orderService.getKitchenOrders(kitchen._id, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
    status,
  });

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * GET /api/v1/orders/:id
 * Get a single order.
 */
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user._id, req.user.role);

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});
