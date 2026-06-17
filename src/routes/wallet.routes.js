import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller.js';
import protect from '../middleware/auth.middleware.js';

const router = Router();

// All wallet routes require authentication
router.use(protect);

router.get('/', walletController.getWalletData);
router.post('/add', walletController.addFunds);
router.post('/withdraw', walletController.withdrawFunds);

export default router;
