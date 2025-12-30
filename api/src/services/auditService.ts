import { query } from '../config/database';
import { logger } from '../utils/logger';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE';

export interface AuditContext {
  userId?: number;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEntry {
  tableName: string;
  recordId: number;
  action: AuditAction;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  context: AuditContext;
}

/**
 * Log an audit entry to the database
 */
export const logAudit = async (entry: AuditEntry): Promise<void> => {
  try {
    // Calculate changed fields
    let changedFields: string[] = [];
    if (entry.action === 'UPDATE' && entry.oldValues && entry.newValues) {
      changedFields = Object.keys(entry.newValues).filter(
        key => JSON.stringify(entry.oldValues?.[key]) !== JSON.stringify(entry.newValues?.[key])
      );
    }

    await query(
      `INSERT INTO audit_logs (
        table_name, record_id, action, old_values, new_values, changed_fields,
        user_id, user_email, user_role, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        entry.tableName,
        entry.recordId,
        entry.action,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        changedFields.length > 0 ? changedFields : null,
        entry.context.userId || null,
        entry.context.userEmail || null,
        entry.context.userRole || null,
        entry.context.ipAddress || null,
        entry.context.userAgent || null,
      ]
    );
  } catch (error) {
    // Log error but don't throw - audit should not break main operations
    logger.error('Failed to write audit log:', error);
  }
};

/**
 * Get audit history for a specific record
 */
export const getAuditHistory = async (
  tableName: string,
  recordId: number,
  limit: number = 50
): Promise<any[]> => {
  const result = await query(
    `SELECT
      al.*,
      w.name as user_name
    FROM audit_logs al
    LEFT JOIN workers w ON al.user_id = w.id
    WHERE al.table_name = $1 AND al.record_id = $2
    ORDER BY al.created_at DESC
    LIMIT $3`,
    [tableName, recordId, limit]
  );
  return result.rows;
};

/**
 * Get recent audit logs
 */
export const getRecentAuditLogs = async (
  limit: number = 100,
  filters?: {
    tableName?: string;
    action?: AuditAction;
    userId?: number;
    fromDate?: string;
    toDate?: string;
  }
): Promise<any[]> => {
  let sql = `
    SELECT
      al.*,
      w.name as user_name
    FROM audit_logs al
    LEFT JOIN workers w ON al.user_id = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.tableName) {
    sql += ` AND al.table_name = $${paramIndex++}`;
    params.push(filters.tableName);
  }

  if (filters?.action) {
    sql += ` AND al.action = $${paramIndex++}`;
    params.push(filters.action);
  }

  if (filters?.userId) {
    sql += ` AND al.user_id = $${paramIndex++}`;
    params.push(filters.userId);
  }

  if (filters?.fromDate) {
    sql += ` AND al.created_at >= $${paramIndex++}`;
    params.push(filters.fromDate);
  }

  if (filters?.toDate) {
    sql += ` AND al.created_at <= $${paramIndex++}`;
    params.push(filters.toDate);
  }

  sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Helper to extract audit context from request
 */
export const getAuditContextFromRequest = (req: any): AuditContext => {
  return {
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
  };
};
