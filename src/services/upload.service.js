import { getCloudinary } from '../config/cloudinary.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import { randomUUID } from 'crypto';

/**
 * Upload a single image buffer to Cloudinary.
 * @param {Buffer} buffer - Image file buffer from multer
 * @param {Object} options
 * @param {string} options.folder - Cloudinary folder (e.g., 'rajabhoj/foods')
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadImage = async (buffer, { folder = 'rajabhoj' } = {}) => {
  const cloudinary = await getCloudinary();

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 600, crop: 'limit', quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    logger.info(`Image uploaded: ${result.secure_url}`);
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    logger.error(`Upload failed: ${error.message}`);
    throw new AppError('Image upload failed. Please try again.', 500);
  }
};

/**
 * Delete an image from Cloudinary.
 */
export const deleteImage = async (publicId) => {
  const cloudinary = await getCloudinary();

  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Image deleted: ${publicId}`);
    return true;
  } catch (error) {
    logger.error(`Delete failed: ${error.message}`);
    return false;
  }
};
