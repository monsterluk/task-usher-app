import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams, validateBody } from '../middleware/validate';
import { idParamSchema, updateWorkSessionSchema } from '../validation/schemas';
import * as workSessionController from '../controllers/workSessionController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get worker's active session
router.get('/worker/:workerId/active', workSessionController.getWorkerActiveSession);

// Manual session management (Manager only)
router.put('/:id', requireRole('MANAGER'), validateParams(idParamSchema), validateBody(updateWorkSessionSchema), workSessionController.updateWorkSession);
router.delete('/:id', requireRole('MANAGER'), validateParams(idParamSchema), workSessionController.deleteWorkSession);

export default router;
