import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import protect from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// All uploads require authentication
router.post(
  '/image',
  protect,
  upload.single('image'),
  uploadController.uploadSingleImage
);

export default router;
