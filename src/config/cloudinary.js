import env from './env.js';
import logger from '../utils/logger.js';

let cloudinaryInstance = null;

/**
 * Get or initialize the Cloudinary SDK.
 * Returns null in mock mode.
 */
export const getCloudinary = async () => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are not configured in the environment.');
  }

  if (!cloudinaryInstance) {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    cloudinaryInstance = cloudinary;
    logger.info('Cloudinary configured');
  }

  return cloudinaryInstance;
};

export default getCloudinary;
