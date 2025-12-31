import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as inventoryController from '../controllers/inventoryController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ Categories ============
router.get('/categories', inventoryController.getCategories);
router.post('/categories', requireRole('MANAGER'), inventoryController.createCategory);

// ============ Materials (Catalog) ============
router.get('/materials', inventoryController.getMaterials);
router.get('/materials/:id', inventoryController.getMaterialById);
router.post('/materials', requireRole('MANAGER'), inventoryController.createMaterial);
router.put('/materials/:id', requireRole('MANAGER'), inventoryController.updateMaterial);

// ============ Storage Locations ============
router.get('/locations', inventoryController.getLocations);
router.post('/locations', requireRole('MANAGER'), inventoryController.createLocation);

// ============ Stock ============
router.get('/stock', inventoryController.getStock);
router.get('/stock/summary', inventoryController.getStockSummary);

// ============ Transactions ============
router.get('/transactions', inventoryController.getTransactions);
router.post('/transactions/pz', requireRole('MANAGER'), inventoryController.createReceiptPZ);
router.post('/transactions/wz', requireRole('MANAGER'), inventoryController.createIssueWZ);

// ============ Reservations ============
router.get('/reservations', inventoryController.getReservations);
router.post('/reservations', requireRole('MANAGER'), inventoryController.createReservation);
router.post('/reservations/:id/issue', requireRole('MANAGER'), inventoryController.issueReservation);
router.delete('/reservations/:id', requireRole('MANAGER'), inventoryController.cancelReservation);

export default router;
