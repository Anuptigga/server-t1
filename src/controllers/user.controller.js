import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * PUT /api/v1/users/location
 * Update the authenticated user's GPS location.
 */
export const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    throw new AppError('Latitude and longitude are required.', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    },
    { new: true, runValidators: true }
  ).select('-password -otp -__v');

  res.status(200).json({
    status: 'success',
    message: 'Location updated.',
    data: { user },
  });
});

/**
 * PUT /api/v1/users/profile
 * Update user profile (name, phone, avatar).
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const updates = {};

  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (avatar) updates.avatar = avatar;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  ).select('-password -otp -__v');

  res.status(200).json({
    status: 'success',
    message: 'Profile updated.',
    data: { user },
  });
});

/**
 * PUT /api/v1/users/bank-details
 * Update user bank details for payouts.
 */
export const updateBankDetails = asyncHandler(async (req, res) => {
  const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      bankDetails: {
        accountHolderName,
        accountNumber,
        ifscCode,
        bankName,
      },
      payoutProfile: {
        razorpayContactId: req.user.payoutProfile?.razorpayContactId || '',
        razorpayFundAccountId: '',
        bankFingerprint: '',
      },
    },
    { new: true, runValidators: true }
  ).select('-password -otp -__v');

  res.status(200).json({
    status: 'success',
    message: 'Bank details updated successfully.',
    data: { user },
  });
});
