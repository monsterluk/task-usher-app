import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as orderItemsController from '../controllers/orderItemsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Update order item
router.put('/:id', requireRole('MANAGER'), orderItemsController.updateOrderItem);

// Delete order item
router.delete('/:id', requireRole('MANAGER'), orderItemsController.deleteOrderItem);

export default router;
