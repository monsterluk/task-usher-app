import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as capacityController from '../controllers/capacityController';

const router = Router();

// All routes require authentication and manager/kierownik role
router.use(authenticate);
router.use(requireRole('KIEROWNIK', 'MANAGER'));

// Get capacity overview by department
router.get('/overview', capacityController.getCapacityOverview);

// Get workload forecast
router.get('/forecast', capacityController.getWorkloadForecast);

// Get bottleneck analysis
router.get('/bottlenecks', capacityController.getBottleneckAnalysis);

// Get worker availability
router.get('/workers', capacityController.getWorkerAvailability);

export default router;
