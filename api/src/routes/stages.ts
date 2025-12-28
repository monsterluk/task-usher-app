import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as stageController from '../controllers/stageController';
import * as assignmentController from '../controllers/assignmentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Stage routes
router.get('/:id', stageController.getStageById);
router.put('/:id', requireRole('MANAGER'), stageController.updateStage);
router.delete('/:id', requireRole('MANAGER'), stageController.deleteStage);

// Assignments (nested under stages)
router.post('/:stageId/assignments', requireRole('MANAGER'), assignmentController.createAssignment);

export default router;
