import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import protect from '../middleware/auth.middleware.js';

import validate from '../middleware/validate.middleware.js';
import { updateBankDetailsSchema } from '../validators/user.validator.js';

const router = Router();

// All user routes require authentication
router.use(protect);

router.put('/location', userController.updateLocation);
router.put('/profile', userController.updateProfile);
router.put(
  '/bank-details',
  validate(updateBankDetailsSchema),
  userController.updateBankDetails
);

export default router;
