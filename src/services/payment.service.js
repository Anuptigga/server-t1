import crypto from 'crypto';
import Razorpay from 'razorpay';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const requirePaymentCredentials = () => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay payment keys are not configured.');
  }
};

const getRazorpayInstance = () => {
  requirePaymentCredentials();
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
};

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || '', 'utf8');
  const rightBuffer = Buffer.from(right || '', 'utf8');
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

export const createPaymentOrder = async (amountInPaise, receipt, notes = {}) => {
  const order = await getRazorpayInstance().orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes,
  });

  logger.info(`Razorpay order created: ${order.id}`);
  return order;
};

export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  requirePaymentCredentials();
  const generated = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return safeEqual(generated, signature);
};

export const fetchPayment = async (paymentId) => {
  return getRazorpayInstance().payments.fetch(paymentId);
};

export const capturePayment = async (paymentId, amountInPaise) => {
  return getRazorpayInstance().payments.capture(
    paymentId,
    amountInPaise,
    'INR'
  );
};

export const createRefund = async (paymentId, amountInPaise, receipt) => {
  return getRazorpayInstance().payments.refund(paymentId, {
    amount: amountInPaise,
    speed: 'normal',
    receipt,
    notes: { reason: 'Order cancellation' },
  });
};

export const verifyWebhookSignature = (rawBody, signature) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured.');
  }

  const generated = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return safeEqual(generated, signature);
};

export const getRazorpayKeyId = () => env.RAZORPAY_KEY_ID;

const getPayoutCredentials = () => {
  const keyId = env.RAZORPAYX_KEY_ID || env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAYX_KEY_SECRET || env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || !env.RAZORPAYX_ACCOUNT_NUMBER) {
    throw new Error(
      'RazorpayX credentials and RAZORPAYX_ACCOUNT_NUMBER are required for withdrawals.'
    );
  }

  return { keyId, keySecret };
};

const razorpayXRequest = async (path, { method = 'GET', body, idempotencyKey } = {}) => {
  const { keyId, keySecret } = getPayoutCredentials();
  const headers = {
    Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['X-Payout-Idempotency'] = idempotencyKey;
  }

  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    error.isAmbiguous = true;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload?.error?.description || `RazorpayX request failed (${response.status}).`
    );
    error.statusCode = response.status;
    error.providerPayload = payload;
    error.isAmbiguous = response.status >= 500;
    throw error;
  }

  return payload;
};

export const createPayoutContact = ({ name, email, phone, referenceId, role }) =>
  razorpayXRequest('/contacts', {
    method: 'POST',
    body: {
      name,
      email,
      contact: phone,
      type: role === 'delivery' ? 'employee' : 'vendor',
      reference_id: referenceId,
      notes: { platform_role: role },
    },
  });

export const createBankFundAccount = ({ contactId, name, accountNumber, ifsc }) =>
  razorpayXRequest('/fund_accounts', {
    method: 'POST',
    body: {
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name,
        ifsc,
        account_number: accountNumber,
      },
    },
  });

export const createBankPayout = ({
  fundAccountId,
  amountInPaise,
  idempotencyKey,
  referenceId,
}) =>
  razorpayXRequest('/payouts', {
    method: 'POST',
    idempotencyKey,
    body: {
      account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: amountInPaise,
      currency: 'INR',
      mode: env.RAZORPAYX_PAYOUT_MODE,
      purpose: 'payout',
      queue_if_low_balance: false,
      reference_id: referenceId,
      narration: 'Rajabhoj payout',
      notes: { withdrawal_id: referenceId },
    },
  });
