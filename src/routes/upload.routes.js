import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import protect from '../middleware/auth.middleware.js';
import { upload, uploadDocument } from '../middleware/upload.middleware.js';

const router = Router();

// All uploads require authentication
router.post(
  '/image',
  protect,
  upload.single('image'),
  uploadController.uploadSingleImage
);

router.post(
  '/document',
  protect,
  uploadDocument.single('document'),
  uploadController.uploadSingleDocument
);

export default router;
