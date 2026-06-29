import asyncHandler from '../utils/asyncHandler.js';
import * as walletService from '../services/wallet.service.js';

/**
 * GET /api/v1/wallet
 * Get user wallet balance and recent transactions
 */
export const getWalletData = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const data = await walletService.getWalletData(req.user._id, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
  });

  res.status(200).json({
    status: 'success',
    data,
  });
});

/**
 * POST /api/v1/wallet/withdraw
 * Withdraw funds from wallet
 */
export const withdrawFunds = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const result = await walletService.withdrawFunds(req.user._id, amount);

  res.status(200).json({
    status: 'success',
    message:
      result.transaction.status === 'completed'
        ? 'Withdrawal completed'
        : 'Withdrawal submitted and is being processed',
    data: result,
  });
});
