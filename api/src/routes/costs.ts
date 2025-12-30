import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as costController from '../controllers/costController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get cost calculation for specific order
router.get('/orders/:id', validateParams(idParamSchema), costController.getOrderCost);

// Update material cost for order (Manager only)
router.put('/orders/:id/material', requireRole('MANAGER'), validateParams(idParamSchema), costController.updateMaterialCost);

// Get cost summary report (Manager only)
router.get('/summary', requireRole('MANAGER'), costController.getCostSummary);

// Calculate quote for new order
router.post('/quote', costController.calculateQuote);

export default router;
