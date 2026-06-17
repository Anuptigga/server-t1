import env from '../config/env.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

/**
 * Payment service with Razorpay.
 */

const getRazorpayInstance = () => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured in the environment.');
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * Create a Razorpay order.
 * @param {number} amountInPaise - Amount in paise (₹100 = 10000)
 * @param {string} receipt - Unique receipt ID (order number)
 * @returns {Promise<{ id: string, amount: number, currency: string }>}
 */
export const createPaymentOrder = async (amountInPaise, receipt) => {
  const instance = getRazorpayInstance();

  const order = await instance.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
  });

  logger.info(`Razorpay order created: ${order.id}`);
  return order;
};

/**
 * Verify Razorpay payment signature.
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean}
 */
export const verifyPayment = async (orderId, paymentId, signature) => {
  const generated = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = generated === signature;
  logger.info(
    `Razorpay verification: ${isValid ? '✅' : '❌'} | Order: ${orderId}`
  );
  return isValid;
};

/**
 * Get Razorpay key ID for frontend.
 */
export const getRazorpayKeyId = () => {
  return env.RAZORPAY_KEY_ID;
};
