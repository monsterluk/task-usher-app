import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { createWorkerSchema, updateWorkerSchema, idParamSchema } from '../validation/schemas';
import * as workerController from '../controllers/workerController';
import * as assignmentController from '../controllers/assignmentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all workers (both roles)
router.get('/', workerController.getAllWorkers);

// Get worker by ID (both roles)
router.get('/:id', validateParams(idParamSchema), workerController.getWorkerById);

// Get worker's assignments (both roles)
router.get('/:id/assignments', validateParams(idParamSchema), workerController.getWorkerAssignments);

// Check worker availability (for scheduling)
router.get('/:id/availability', validateParams(idParamSchema), assignmentController.checkWorkerAvailability);

// Manager only routes
router.post('/', requireRole('MANAGER'), validateBody(createWorkerSchema), workerController.createWorker);
router.put('/:id', requireRole('MANAGER'), validateParams(idParamSchema), validateBody(updateWorkerSchema), workerController.updateWorker);
router.delete('/:id', requireRole('MANAGER'), validateParams(idParamSchema), workerController.deleteWorker);

export default router;
