import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import Order from '../models/Order.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import {
  verifyWebhookSignature,
  createRefund,
} from '../services/payment.service.js';
import { reconcilePayout } from '../services/wallet.service.js';

const processPaymentCaptured = async (payment, req) => {
  if (!payment?.order_id) return;

  const order = await Order.findOne({ 'payment.razorpayOrderId': payment.order_id });
  if (!order) return;
  if (
    payment.amount !== Math.round(order.total * 100) ||
    payment.currency !== 'INR'
  ) {
    throw new AppError('Webhook payment amount does not match the order.', 400);
  }

  const wasCompleted = order.payment.status === PAYMENT_STATUS.COMPLETED;
  order.payment.status = PAYMENT_STATUS.COMPLETED;
  order.payment.razorpayPaymentId = payment.id;
  order.payment.paidAt ||= new Date();

  if (
    order.status === ORDER_STATUS.CANCELLED &&
    !order.payment.razorpayRefundId
  ) {
    const refund = await createRefund(
      payment.id,
      Math.round(order.total * 100),
      `refund_${order.orderNumber}`
    );
    order.payment.razorpayRefundId = refund.id;
    order.payment.refundStatus = refund.status;
    order.payment.status =
      refund.status === 'processed'
        ? PAYMENT_STATUS.REFUNDED
        : PAYMENT_STATUS.REFUND_PENDING;
  }
  await order.save();

  if (!wasCompleted && order.status !== ORDER_STATUS.CANCELLED) {
    req.app.get('io')?.to(`kitchen:${order.kitchen}`).emit('order:new', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      itemCount: order.items.length,
    });
  }
};

const processRefund = async (refund) => {
  if (!refund?.id) return;

  const order = await Order.findOne({
    $or: [
      { 'payment.razorpayRefundId': refund.id },
      { 'payment.razorpayPaymentId': refund.payment_id },
    ],
  });
  if (!order) return;

  order.payment.razorpayRefundId = refund.id;
  order.payment.refundStatus = refund.status;
  order.payment.status =
    refund.status === 'processed'
      ? PAYMENT_STATUS.REFUNDED
      : PAYMENT_STATUS.REFUND_PENDING;
  await order.save();
};

export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  if (!signature || !verifyWebhookSignature(req.body, signature)) {
    throw new AppError('Invalid Razorpay webhook signature.', 401);
  }

  const payload = JSON.parse(req.body.toString('utf8'));
  const eventId =
    req.get('x-razorpay-event-id') ||
    crypto.createHash('sha256').update(req.body).digest('hex');

  try {
    await WebhookEvent.create({
      provider: 'razorpay',
      eventId,
      eventType: payload.event,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({ status: 'success', duplicate: true });
    }
    throw error;
  }

  try {
    if (['payment.captured', 'order.paid'].includes(payload.event)) {
      await processPaymentCaptured(payload.payload?.payment?.entity, req);
    } else if (payload.event === 'payment.failed') {
      const payment = payload.payload?.payment?.entity;
      await Order.updateOne(
        {
          'payment.razorpayOrderId': payment?.order_id,
          'payment.status': PAYMENT_STATUS.PENDING,
        },
        { $set: { 'payment.status': PAYMENT_STATUS.FAILED } }
      );
    } else if (payload.event === 'refund.processed') {
      await processRefund(payload.payload?.refund?.entity);
    } else if (payload.event === 'refund.failed') {
      const refund = payload.payload?.refund?.entity;
      await Order.updateOne(
        { 'payment.razorpayRefundId': refund?.id },
        {
          $set: {
            'payment.refundStatus': 'failed',
            'payment.status': PAYMENT_STATUS.COMPLETED,
          },
        }
      );
    } else if (payload.event?.startsWith('payout.')) {
      await reconcilePayout(payload.payload?.payout?.entity);
    }
  } catch (error) {
    await WebhookEvent.deleteOne({ provider: 'razorpay', eventId });
    throw error;
  }

  res.status(200).json({ status: 'success' });
});
