import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as traceabilityController from '../controllers/traceabilityController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ Production Batches ============
router.get('/batches', traceabilityController.getBatches);
router.get('/batches/:id', traceabilityController.getBatchById);
router.post('/batches', traceabilityController.createBatch);
router.put('/batches/:id', traceabilityController.updateBatch);

// Batch materials
router.post('/batches/:batchId/materials', traceabilityController.addBatchMaterial);

// ============ Events ============
router.post('/events', traceabilityController.recordEvent);

// ============ Machine Parameters ============
router.post('/parameters', traceabilityController.recordMachineParameter);

// ============ Genealogy ============
router.get('/genealogy/:batchNumber', traceabilityController.getGenealogy);

// ============ Helpers ============
router.get('/generate-batch-number', traceabilityController.generateBatchNumber);

export default router;
