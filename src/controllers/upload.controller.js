import asyncHandler from '../utils/asyncHandler.js';
import { uploadImage } from '../services/upload.service.js';
import AppError from '../utils/AppError.js';

/**
 * POST /api/v1/upload/image
 * Upload a single image and return the URL.
 */
export const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image file provided.', 400);
  }

  const category = req.query.category || 'food';
  const folder = `rajabhoj/${category}s`;

  const { url, publicId } = await uploadImage(req.file.buffer, {
    folder,
    category,
  });

  res.status(200).json({
    status: 'success',
    data: { url, publicId },
  });
});
