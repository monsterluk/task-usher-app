import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as stageController from '../controllers/stageController';
import * as assignmentController from '../controllers/assignmentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ Standard Times (TPZ, TJ) ============
// These routes MUST be before /:id to avoid conflicts
router.get('/time-standards', stageController.getTimeStandards);
router.post('/time-standards', requireRole('MANAGER'), stageController.createTimeStandard);
router.put('/time-standards/:id', requireRole('MANAGER'), stageController.updateTimeStandard);
router.get('/efficiency-report', stageController.getEfficiencyReport);

// Stage routes
router.get('/:id', stageController.getStageById);
router.put('/:id', requireRole('MANAGER'), stageController.updateStage);
router.delete('/:id', requireRole('MANAGER'), stageController.deleteStage);

// Stage times management
router.put('/:id/times', stageController.updateStageTimes);
router.post('/:id/apply-standard', stageController.applyStandardTimes);

// Assignments (nested under stages)
router.post('/:stageId/assignments', requireRole('MANAGER'), assignmentController.createAssignment);

export default router;
