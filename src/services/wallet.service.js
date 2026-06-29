import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Kitchen from '../models/Kitchen.js';
import AppError from '../utils/AppError.js';
import {
  createPayoutContact,
  createBankFundAccount,
  createBankPayout,
} from './payment.service.js';

const payoutFingerprint = (bankDetails) =>
  crypto
    .createHash('sha256')
    .update(`${bankDetails.accountNumber}|${bankDetails.ifscCode}`)
    .digest('hex');

const getOrCreateFundAccount = async (user) => {
  const fingerprint = payoutFingerprint(user.bankDetails);
  if (
    user.payoutProfile?.razorpayFundAccountId &&
    user.payoutProfile?.bankFingerprint === fingerprint
  ) {
    return user.payoutProfile.razorpayFundAccountId;
  }

  let contactId = user.payoutProfile?.razorpayContactId;
  if (!contactId) {
    const contact = await createPayoutContact({
      name: user.name,
      email: user.email,
      phone: user.phone,
      referenceId: user._id.toString(),
      role: user.role,
    });
    contactId = contact.id;
    await User.findByIdAndUpdate(user._id, {
      'payoutProfile.razorpayContactId': contactId,
    });
  }

  const fundAccount = await createBankFundAccount({
    contactId,
    name: user.bankDetails.accountHolderName,
    accountNumber: user.bankDetails.accountNumber,
    ifsc: user.bankDetails.ifscCode,
  });

  await User.findByIdAndUpdate(user._id, {
    payoutProfile: {
      razorpayContactId: contactId,
      razorpayFundAccountId: fundAccount.id,
      bankFingerprint: fingerprint,
    },
  });

  return fundAccount.id;
};

const restoreFailedWithdrawal = async (transaction, providerStatus, reason) => {
  const failed = await Transaction.findOneAndUpdate(
    { _id: transaction._id, status: 'pending' },
    {
      $set: {
        status: 'failed',
        referenceId: transaction.referenceId,
        providerStatus,
        failureReason: reason || 'Payout failed',
      },
    },
    { new: true }
  );

  if (failed) {
    await User.findByIdAndUpdate(transaction.user, {
      $inc: { walletBalance: transaction.amount },
    });
  }

  return failed || transaction;
};

export const reconcilePayout = async (payout) => {
  if (!payout?.id) return null;

  const withdrawalId = payout.notes?.withdrawal_id;
  const transaction = await Transaction.findOne({
    $or: [
      { referenceId: payout.id },
      ...(mongoose.isValidObjectId(withdrawalId) ? [{ _id: withdrawalId }] : []),
    ],
  });
  if (!transaction) return null;
  if (!transaction.referenceId) transaction.referenceId = payout.id;

  const failedStatuses = ['failed', 'reversed', 'rejected', 'cancelled'];
  if (failedStatuses.includes(payout.status)) {
    return restoreFailedWithdrawal(
      transaction,
      payout.status,
      payout.status_details?.description
    );
  }

  if (payout.status === 'processed') {
    return Transaction.findOneAndUpdate(
      { _id: transaction._id, status: 'pending' },
      {
        $set: {
          status: 'completed',
          referenceId: transaction.referenceId,
          providerStatus: payout.status,
          completedAt: new Date(),
          failureReason: '',
        },
      },
      { new: true }
    );
  }

  transaction.providerStatus = payout.status || transaction.providerStatus;
  await transaction.save();
  return transaction;
};

export const withdrawFunds = async (userId, amount) => {
  if (!Number.isFinite(amount) || amount < 500) {
    throw new AppError('Minimum withdrawal amount is ₹500', 400);
  }

  const normalizedAmount = Math.round(amount * 100) / 100;
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (!['kitchen', 'delivery'].includes(user.role)) {
    throw new AppError('Only sellers and delivery partners can withdraw earnings', 403);
  }
  if (
    !user.bankDetails?.accountHolderName ||
    !user.bankDetails?.accountNumber ||
    !user.bankDetails?.ifscCode
  ) {
    throw new AppError('Please add your bank details before withdrawing funds', 400);
  }

  const fundAccountId = await getOrCreateFundAccount(user);
  const transactionId = new mongoose.Types.ObjectId();
  const idempotencyKey = `withdraw_${transactionId}`;

  const transaction = await Transaction.create({
    _id: transactionId,
    user: userId,
    type: 'debit',
    amount: normalizedAmount,
    purpose: 'withdraw',
    description: 'Withdrawal to bank account',
    status: 'pending',
    providerStatus: 'created',
    idempotencyKey,
  });

  const debitedUser = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: normalizedAmount } },
    { $inc: { walletBalance: -normalizedAmount } },
    { new: true }
  );

  if (!debitedUser) {
    await Transaction.findByIdAndDelete(transaction._id);
    throw new AppError('Insufficient wallet balance', 400);
  }

  try {
    const payout = await createBankPayout({
      fundAccountId,
      amountInPaise: Math.round(normalizedAmount * 100),
      idempotencyKey,
      referenceId: transaction._id.toString(),
    });

    transaction.referenceId = payout.id;
    transaction.providerStatus = payout.status;
    await transaction.save();
    await reconcilePayout(payout);

    return {
      balance: debitedUser.walletBalance,
      transaction: await Transaction.findById(transaction._id),
    };
  } catch (error) {
    if (!error.isAmbiguous) {
      await restoreFailedWithdrawal(
        transaction,
        'failed',
        error.message
      );
    } else {
      transaction.failureReason =
        'Payout confirmation is pending. It will be reconciled by webhook.';
      await transaction.save();
      return {
        balance: debitedUser.walletBalance,
        transaction,
      };
    }

    throw new AppError(
      error.message,
      502
    );
  }
};

export const getWalletData = async (userId, { page = 1, limit = 10 }) => {
  const user = await User.findById(userId).select('walletBalance');
  if (!user) throw new AppError('User not found', 404);

  const query = { user: userId };
  const total = await Transaction.countDocuments(query);
  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    balance: user.walletBalance,
    transactions,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

export const creditEarnings = async (
  userId,
  amount,
  purpose,
  description,
  orderId,
  kitchenId = null
) => {
  const existing = await Transaction.findOne({ user: userId, purpose, order: orderId });
  if (existing) return User.findById(userId);

  const transaction = await Transaction.create({
    user: userId,
    kitchen: kitchenId,
    type: 'credit',
    amount,
    purpose,
    description,
    order: orderId,
    status: 'pending',
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true }
  );

  if (!user) {
    await Transaction.findByIdAndDelete(transaction._id);
    return null;
  }

  transaction.status = 'completed';
  transaction.completedAt = new Date();
  await transaction.save();
  return user;
};

export const settleOrderEarnings = async (order) => {
  const kitchen = await Kitchen.findById(order.kitchen?._id || order.kitchen);
  if (!kitchen) throw new AppError('Kitchen not found while settling earnings', 404);

  const commissionAmount = (order.subtotal * (kitchen.commission || 10)) / 100;
  const kitchenEarnings = Math.max(0, order.subtotal - commissionAmount);

  await creditEarnings(
    kitchen.owner,
    kitchenEarnings,
    'order_earnings',
    `Earnings for order #${order.orderNumber}`,
    order._id,
    kitchen._id
  );

  if (order.deliveryType === 'delivery' && order.deliveryPartner) {
    await creditEarnings(
      order.deliveryPartner,
      order.deliveryFee,
      'delivery_earnings',
      `Earnings for delivering order #${order.orderNumber}`,
      order._id
    );
  }
};
