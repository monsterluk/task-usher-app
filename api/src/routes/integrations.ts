import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as integrationController from '../controllers/integrationController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ INTEGRATION MANAGEMENT (ADMIN ONLY) ============
router.get('/', requireRole('ADMIN'), integrationController.getIntegrations);
router.get('/:name', requireRole('ADMIN'), integrationController.getIntegration);
router.put('/:name', requireRole('ADMIN'), integrationController.updateIntegration);
router.post('/:name/test', requireRole('ADMIN'), integrationController.testIntegration);
router.get('/:name/logs', requireRole('ADMIN'), integrationController.getIntegrationLogs);

// ============ WFIRMA.PL SPECIFIC ROUTES ============
router.post('/wfirma/create-invoice', requireRole('MANAGER'), integrationController.createWfirmaInvoice);
router.get('/wfirma/invoices', requireRole('MANAGER'), integrationController.getWfirmaInvoices);

// ============ APACZKA.PL SPECIFIC ROUTES ============
router.post('/apaczka/create-shipment', requireRole('MANAGER'), integrationController.createApaczkaShipment);
router.get('/apaczka/services', requireRole('MANAGER'), integrationController.getApaczkaServices);

export default router;
