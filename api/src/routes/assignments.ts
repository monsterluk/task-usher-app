import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as assignmentController from '../controllers/assignmentController';
import * as workSessionController from '../controllers/workSessionController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Assignment routes
router.get('/:id', assignmentController.getAssignmentById);
router.put('/:id', assignmentController.updateAssignment); // Workers can update their own assignments
router.delete('/:id', requireRole('MANAGER'), assignmentController.deleteAssignment);

// Work sessions (Timer - START/STOP)
router.post('/:assignmentId/start', workSessionController.startTimer);
router.post('/:assignmentId/stop', workSessionController.stopTimer);
router.get('/:assignmentId/sessions', workSessionController.getAssignmentSessions);

export default router;
