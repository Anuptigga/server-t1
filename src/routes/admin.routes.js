import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import protect from '../middleware/auth.middleware.js';
import restrictTo from '../middleware/role.middleware.js';

const router = Router();

// Protect all admin routes and restrict to 'admin' role
router.use(protect, restrictTo('admin'));

router.get('/overview', adminController.getOverview);
router.get('/kitchens', adminController.getKitchens);
router.put('/kitchens/:id/moderate', adminController.moderateKitchen);
router.get('/users', adminController.getUsers);
router.get('/orders', adminController.getGlobalOrders);

export default router;
