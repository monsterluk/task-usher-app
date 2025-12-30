import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as bomController from '../controllers/bomController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ BOM Templates ============
// Templates are managed by MANAGER role
router.get('/templates', bomController.getBomTemplates);
router.get('/templates/:id', bomController.getBomTemplateById);
router.post('/templates', requireRole('MANAGER'), bomController.createBomTemplate);
router.put('/templates/:id', requireRole('MANAGER'), bomController.updateBomTemplate);
router.delete('/templates/:id', requireRole('MANAGER'), bomController.deleteBomTemplate);

// Template items
router.post('/templates/:templateId/items', requireRole('MANAGER'), bomController.addBomTemplateItem);
router.put('/template-items/:id', requireRole('MANAGER'), bomController.updateBomTemplateItem);
router.delete('/template-items/:id', requireRole('MANAGER'), bomController.deleteBomTemplateItem);

// ============ Order BOM Items ============
// These are accessible by all authenticated users but modifications by MANAGER
router.post('/order-bom/:bomId/items', requireRole('MANAGER'), bomController.addOrderBomItem);
router.put('/order-bom-items/:id', bomController.updateOrderBomItem);
router.post('/order-bom-items/:id/issue', bomController.issueBomItem);
router.delete('/order-bom-items/:id', requireRole('MANAGER'), bomController.deleteOrderBomItem);

export default router;
