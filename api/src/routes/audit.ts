import { Router, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getAuditHistory, getRecentAuditLogs } from '../services/auditService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

// All audit routes require authentication and ADMIN/KIEROWNIK role
router.use(authenticate);
router.use(requireRole('ADMIN', 'KIEROWNIK'));

// GET /api/audit - Get recent audit logs
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    table_name,
    action,
    user_id,
    from_date,
    to_date,
    limit = 100
  } = req.query;

  const logs = await getRecentAuditLogs(
    Number(limit),
    {
      tableName: table_name as string,
      action: action as any,
      userId: user_id ? Number(user_id) : undefined,
      fromDate: from_date as string,
      toDate: to_date as string,
    }
  );

  res.json({
    success: true,
    data: { logs, total: logs.length }
  });
}));

// GET /api/audit/:table/:recordId - Get audit history for specific record
router.get('/:table/:recordId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { table, recordId } = req.params;
  const { limit = 50 } = req.query;

  const history = await getAuditHistory(
    table,
    Number(recordId),
    Number(limit)
  );

  res.json({
    success: true,
    data: { history, total: history.length }
  });
}));

export default router;
