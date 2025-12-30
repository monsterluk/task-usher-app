import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as productionReportController from '../controllers/productionReportController';

const router = Router();

// All routes require authentication and manager role
router.use(authenticate);
router.use(requireRole('MANAGER'));

// Get comprehensive production report
router.get('/', productionReportController.getProductionReport);

// Get comparison report (this period vs previous)
router.get('/comparison', productionReportController.getComparisonReport);

// Get export data (for CSV/Excel)
router.get('/export', productionReportController.getExportData);

export default router;
