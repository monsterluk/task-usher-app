import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as qualityController from '../controllers/qualityController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ QC CHECKPOINTS ============

// Get all checkpoints (templates)
router.get('/checkpoints', qualityController.getCheckpoints);

// Create checkpoint (Manager only)
router.post('/checkpoints', requireRole('MANAGER'), qualityController.createCheckpoint);

// Update checkpoint (Manager only)
router.put('/checkpoints/:id', requireRole('MANAGER'), validateParams(idParamSchema), qualityController.updateCheckpoint);

// Delete checkpoint (Manager only)
router.delete('/checkpoints/:id', requireRole('MANAGER'), validateParams(idParamSchema), qualityController.deleteCheckpoint);

// ============ QUALITY CHECKS ============

// Get all quality checks (with filters)
router.get('/checks', qualityController.getQualityChecks);

// Update quality check
router.put('/checks/:id', validateParams(idParamSchema), qualityController.updateQualityCheck);

// ============ DEFECTS ============

// Get all defects (with filters)
router.get('/defects', qualityController.getDefects);

// Update defect
router.put('/defects/:id', validateParams(idParamSchema), qualityController.updateDefect);

// ============ STATS ============

// Get quality statistics
router.get('/stats', qualityController.getQualityStats);

export default router;
