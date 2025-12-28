import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as workSessionController from '../controllers/workSessionController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get worker's active session
router.get('/worker/:workerId/active', workSessionController.getWorkerActiveSession);

// Manual session management (Manager only)
router.put('/:id', requireRole('MANAGER'), workSessionController.updateWorkSession);
router.delete('/:id', requireRole('MANAGER'), workSessionController.deleteWorkSession);

export default router;
