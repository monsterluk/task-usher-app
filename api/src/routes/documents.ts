import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as documentsController from '../controllers/documentsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get documents for an order
router.get('/orders/:orderId', documentsController.getOrderDocuments);

// Get document by ID
router.get('/:id', validateParams(idParamSchema), documentsController.getDocumentById);

// Upload new document
router.post('/', documentsController.uploadDocument);

// Update document metadata
router.put('/:id', validateParams(idParamSchema), documentsController.updateDocument);

// Delete document (Manager only)
router.delete('/:id', requireRole('MANAGER'), validateParams(idParamSchema), documentsController.deleteDocument);

// Get document versions
router.get('/:id/versions', validateParams(idParamSchema), documentsController.getDocumentVersions);

// Upload new version
router.post('/:id/versions', validateParams(idParamSchema), documentsController.uploadNewVersion);

// Get documents by category
router.get('/category/:category', documentsController.getDocumentsByCategory);

// Get document statistics (Manager only)
router.get('/stats/overview', requireRole('MANAGER'), documentsController.getDocumentStats);

export default router;
