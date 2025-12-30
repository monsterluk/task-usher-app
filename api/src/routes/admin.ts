import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as adminController from '../controllers/adminController';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);

// Dashboard stats - accessible by KIEROWNIK and ADMIN
router.get('/stats', requireRole('KIEROWNIK'), adminController.getAdminStats);
router.get('/activity', requireRole('KIEROWNIK'), adminController.getRecentActivity);

// Material prices - ADMIN only
router.get('/materials', requireRole('ADMIN'), adminController.getMaterialPrices);
router.post('/materials', requireRole('ADMIN'), adminController.createMaterialPrice);
router.put('/materials/:id', requireRole('ADMIN'), validateParams(idParamSchema), adminController.updateMaterialPrice);
router.delete('/materials/:id', requireRole('ADMIN'), validateParams(idParamSchema), adminController.deleteMaterialPrice);

// Production settings (margins, rates) - ADMIN only
router.get('/settings', requireRole('ADMIN'), adminController.getProductionSettings);
router.put('/settings', requireRole('ADMIN'), adminController.updateProductionSettingsBatch);
router.put('/settings/:key', requireRole('ADMIN'), adminController.updateProductionSetting);

export default router;
