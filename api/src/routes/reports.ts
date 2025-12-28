import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as reportController from '../controllers/reportController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Order reports (both roles can view)
router.get('/order/:orderId', reportController.getOrderReport);
router.get('/export/:orderId', reportController.exportOrderReport);

// Worker reports (Manager only for all workers, Worker can see their own)
router.get('/worker/:workerId', reportController.getWorkerReport);
router.get('/export/worker/:workerId', reportController.exportWorkerReport);

// Summary report (Manager only)
router.get('/summary', requireRole('MANAGER'), reportController.getSummaryReport);

export default router;
