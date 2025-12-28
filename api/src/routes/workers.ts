import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as workerController from '../controllers/workerController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all workers (both roles)
router.get('/', workerController.getAllWorkers);

// Get worker by ID (both roles)
router.get('/:id', workerController.getWorkerById);

// Get worker's assignments (both roles)
router.get('/:id/assignments', workerController.getWorkerAssignments);

// Manager only routes
router.post('/', requireRole('MANAGER'), workerController.createWorker);
router.put('/:id', requireRole('MANAGER'), workerController.updateWorker);
router.delete('/:id', requireRole('MANAGER'), workerController.deleteWorker);

export default router;
