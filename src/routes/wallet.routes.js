import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller.js';
import protect from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();

// All wallet routes require authentication
router.use(protect);

router.get('/', walletController.getWalletData);
router.post(
  '/withdraw',
  authorize('kitchen', 'delivery'),
  walletController.withdrawFunds
);

export default router;
