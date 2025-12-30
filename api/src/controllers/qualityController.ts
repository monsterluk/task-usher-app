import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logAudit, getAuditContextFromRequest } from '../services/auditService';

// ============ QC CHECKPOINTS ============

// GET /api/quality/checkpoints
export const getCheckpoints = asyncHandler(async (req: Request, res: Response) => {
  const { active, category } = req.query;

  let sql = 'SELECT * FROM qc_checkpoints WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (active !== undefined) {
    sql += ` AND active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  if (category) {
    sql += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  sql += ' ORDER BY sequence_order ASC, name ASC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { checkpoints: result.rows },
  });
});

// POST /api/quality/checkpoints
export const createCheckpoint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, category, measurement_type, min_value, max_value, unit, options, is_critical, sequence_order } = req.body;

  if (!name) {
    throw new AppError('Nazwa punktu kontrolnego jest wymagana', 400);
  }

  const result = await query(
    `INSERT INTO qc_checkpoints (name, description, category, measurement_type, min_value, max_value, unit, options, is_critical, sequence_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      name,
      description || null,
      category || null,
      measurement_type || 'boolean',
      min_value || null,
      max_value || null,
      unit || null,
      options ? JSON.stringify(options) : null,
      is_critical || false,
      sequence_order || 0,
    ]
  );

  const checkpoint = result.rows[0];

  await logAudit({
    tableName: 'qc_checkpoints',
    recordId: checkpoint.id,
    action: 'CREATE',
    newValues: checkpoint,
    context: getAuditContextFromRequest(req),
  });

  res.status(201).json({
    success: true,
    data: { checkpoint },
  });
});

// PUT /api/quality/checkpoints/:id
export const updateCheckpoint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, category, measurement_type, min_value, max_value, unit, options, is_critical, sequence_order, active } = req.body;

  const existingResult = await query('SELECT * FROM qc_checkpoints WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Punkt kontrolny nie znaleziony', 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fields: Record<string, any> = {
    name, description, category, measurement_type, min_value, max_value, unit,
    options: options ? JSON.stringify(options) : undefined,
    is_critical, sequence_order, active,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    throw new AppError('Brak pól do aktualizacji', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE qc_checkpoints SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await query(sql, params);

  await logAudit({
    tableName: 'qc_checkpoints',
    recordId: Number(id),
    action: 'UPDATE',
    oldValues: existingResult.rows[0],
    newValues: result.rows[0],
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: { checkpoint: result.rows[0] },
  });
});

// DELETE /api/quality/checkpoints/:id
export const deleteCheckpoint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existingResult = await query('SELECT * FROM qc_checkpoints WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Punkt kontrolny nie znaleziony', 404);
  }

  await logAudit({
    tableName: 'qc_checkpoints',
    recordId: Number(id),
    action: 'DELETE',
    oldValues: existingResult.rows[0],
    context: getAuditContextFromRequest(req),
  });

  await query('DELETE FROM qc_checkpoints WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Punkt kontrolny usunięty',
  });
});

// ============ QUALITY CHECKS ============

// GET /api/quality/checks
export const getQualityChecks = asyncHandler(async (req: Request, res: Response) => {
  const { order_id, stage_id, status, check_type, limit = 100, offset = 0 } = req.query;

  let sql = `
    SELECT qc.*,
           o.order_number,
           s.stage_name,
           cp.name as checkpoint_name,
           w.name as inspector_name
    FROM quality_checks qc
    LEFT JOIN orders o ON qc.order_id = o.id
    LEFT JOIN stages s ON qc.stage_id = s.id
    LEFT JOIN qc_checkpoints cp ON qc.checkpoint_id = cp.id
    LEFT JOIN workers w ON qc.inspector_id = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (order_id) {
    sql += ` AND qc.order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (stage_id) {
    sql += ` AND qc.stage_id = $${paramIndex}`;
    params.push(stage_id);
    paramIndex++;
  }

  if (status) {
    sql += ` AND qc.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (check_type) {
    sql += ` AND qc.check_type = $${paramIndex}`;
    params.push(check_type);
    paramIndex++;
  }

  sql += ` ORDER BY qc.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { checks: result.rows },
  });
});

// GET /api/orders/:orderId/quality-checks
export const getOrderQualityChecks = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const result = await query(
    `SELECT qc.*,
            s.stage_name,
            cp.name as checkpoint_name, cp.category, cp.is_critical,
            w.name as inspector_name
     FROM quality_checks qc
     LEFT JOIN stages s ON qc.stage_id = s.id
     LEFT JOIN qc_checkpoints cp ON qc.checkpoint_id = cp.id
     LEFT JOIN workers w ON qc.inspector_id = w.id
     WHERE qc.order_id = $1
     ORDER BY qc.created_at DESC`,
    [orderId]
  );

  // Calculate summary stats
  const stats = {
    total: result.rows.length,
    passed: result.rows.filter((c: any) => c.status === 'passed').length,
    failed: result.rows.filter((c: any) => c.status === 'failed').length,
    pending: result.rows.filter((c: any) => c.status === 'pending').length,
    conditional: result.rows.filter((c: any) => c.status === 'conditional').length,
  };

  res.json({
    success: true,
    data: { checks: result.rows, stats },
  });
});

// POST /api/orders/:orderId/quality-checks
export const createQualityCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { stage_id, checkpoint_id, check_type, status, measured_value, is_within_tolerance, notes } = req.body;

  // Verify order exists
  const orderResult = await query('SELECT id FROM orders WHERE id = $1', [orderId]);
  if (orderResult.rows.length === 0) {
    throw new AppError('Zlecenie nie znalezione', 404);
  }

  const result = await query(
    `INSERT INTO quality_checks (order_id, stage_id, checkpoint_id, inspector_id, check_type, status, measured_value, is_within_tolerance, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      orderId,
      stage_id || null,
      checkpoint_id || null,
      req.user?.id || null,
      check_type || 'in_process',
      status || 'pending',
      measured_value || null,
      is_within_tolerance,
      notes || null,
    ]
  );

  const check = result.rows[0];

  await logAudit({
    tableName: 'quality_checks',
    recordId: check.id,
    action: 'CREATE',
    newValues: check,
    context: getAuditContextFromRequest(req),
  });

  logger.info(`Quality check created for order ${orderId}`);

  res.status(201).json({
    success: true,
    data: { check },
  });
});

// PUT /api/quality/checks/:id
export const updateQualityCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, measured_value, is_within_tolerance, notes } = req.body;

  const existingResult = await query('SELECT * FROM quality_checks WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Kontrola jakości nie znaleziona', 404);
  }

  const result = await query(
    `UPDATE quality_checks
     SET status = COALESCE($1, status),
         measured_value = COALESCE($2, measured_value),
         is_within_tolerance = COALESCE($3, is_within_tolerance),
         notes = COALESCE($4, notes),
         checked_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [status, measured_value, is_within_tolerance, notes, id]
  );

  await logAudit({
    tableName: 'quality_checks',
    recordId: Number(id),
    action: 'UPDATE',
    oldValues: existingResult.rows[0],
    newValues: result.rows[0],
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: { check: result.rows[0] },
  });
});

// ============ DEFECTS ============

// GET /api/quality/defects
export const getDefects = asyncHandler(async (req: Request, res: Response) => {
  const { order_id, status, severity, limit = 100, offset = 0 } = req.query;

  let sql = `
    SELECT d.*,
           o.order_number,
           s.stage_name,
           w1.name as reported_by_name,
           w2.name as resolved_by_name
    FROM defects d
    LEFT JOIN orders o ON d.order_id = o.id
    LEFT JOIN stages s ON d.stage_id = s.id
    LEFT JOIN workers w1 ON d.reported_by = w1.id
    LEFT JOIN workers w2 ON d.resolved_by = w2.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (order_id) {
    sql += ` AND d.order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (status) {
    sql += ` AND d.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (severity) {
    sql += ` AND d.severity = $${paramIndex}`;
    params.push(severity);
    paramIndex++;
  }

  sql += ` ORDER BY
    CASE d.severity
      WHEN 'critical' THEN 1
      WHEN 'major' THEN 2
      WHEN 'minor' THEN 3
      WHEN 'cosmetic' THEN 4
    END,
    d.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { defects: result.rows },
  });
});

// GET /api/orders/:orderId/defects
export const getOrderDefects = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const result = await query(
    `SELECT d.*,
            s.stage_name,
            w1.name as reported_by_name,
            w2.name as resolved_by_name
     FROM defects d
     LEFT JOIN stages s ON d.stage_id = s.id
     LEFT JOIN workers w1 ON d.reported_by = w1.id
     LEFT JOIN workers w2 ON d.resolved_by = w2.id
     WHERE d.order_id = $1
     ORDER BY d.created_at DESC`,
    [orderId]
  );

  // Calculate summary stats
  const stats = {
    total: result.rows.length,
    open: result.rows.filter((d: any) => d.status === 'open').length,
    inProgress: result.rows.filter((d: any) => d.status === 'in_progress').length,
    resolved: result.rows.filter((d: any) => d.status === 'resolved').length,
    critical: result.rows.filter((d: any) => d.severity === 'critical').length,
    major: result.rows.filter((d: any) => d.severity === 'major').length,
  };

  res.json({
    success: true,
    data: { defects: result.rows, stats },
  });
});

// POST /api/orders/:orderId/defects
export const createDefect = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { quality_check_id, stage_id, defect_type, severity, description, quantity_affected, cost_impact, photos } = req.body;

  if (!defect_type || !description) {
    throw new AppError('Typ wady i opis są wymagane', 400);
  }

  // Verify order exists
  const orderResult = await query('SELECT id FROM orders WHERE id = $1', [orderId]);
  if (orderResult.rows.length === 0) {
    throw new AppError('Zlecenie nie znalezione', 404);
  }

  const result = await query(
    `INSERT INTO defects (order_id, quality_check_id, stage_id, reported_by, defect_type, severity, description, quantity_affected, cost_impact, photos)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      orderId,
      quality_check_id || null,
      stage_id || null,
      req.user?.id || null,
      defect_type,
      severity || 'minor',
      description,
      quantity_affected || 1,
      cost_impact || null,
      photos ? JSON.stringify(photos) : null,
    ]
  );

  const defect = result.rows[0];

  await logAudit({
    tableName: 'defects',
    recordId: defect.id,
    action: 'CREATE',
    newValues: defect,
    context: getAuditContextFromRequest(req),
  });

  logger.info(`Defect reported for order ${orderId}: ${defect_type}`);

  res.status(201).json({
    success: true,
    data: { defect },
  });
});

// PUT /api/quality/defects/:id
export const updateDefect = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, root_cause, corrective_action, quantity_affected, cost_impact } = req.body;

  const existingResult = await query('SELECT * FROM defects WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Wada nie znaleziona', 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;

    // If resolving, set resolved_by and resolved_at
    if (status === 'resolved' || status === 'accepted') {
      updates.push(`resolved_by = $${paramIndex}`);
      params.push(req.user?.id || null);
      paramIndex++;
      updates.push(`resolved_at = NOW()`);
    }
  }

  if (root_cause !== undefined) {
    updates.push(`root_cause = $${paramIndex}`);
    params.push(root_cause);
    paramIndex++;
  }

  if (corrective_action !== undefined) {
    updates.push(`corrective_action = $${paramIndex}`);
    params.push(corrective_action);
    paramIndex++;
  }

  if (quantity_affected !== undefined) {
    updates.push(`quantity_affected = $${paramIndex}`);
    params.push(quantity_affected);
    paramIndex++;
  }

  if (cost_impact !== undefined) {
    updates.push(`cost_impact = $${paramIndex}`);
    params.push(cost_impact);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new AppError('Brak pól do aktualizacji', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE defects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await query(sql, params);

  await logAudit({
    tableName: 'defects',
    recordId: Number(id),
    action: 'UPDATE',
    oldValues: existingResult.rows[0],
    newValues: result.rows[0],
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: { defect: result.rows[0] },
  });
});

// ============ QC DASHBOARD STATS ============

// GET /api/quality/stats
export const getQualityStats = asyncHandler(async (req: Request, res: Response) => {
  const { from_date, to_date } = req.query;

  // Overall quality check stats
  const checksResult = await query(`
    SELECT
      COUNT(*) as total_checks,
      COUNT(*) FILTER (WHERE status = 'passed') as passed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'conditional') as conditional
    FROM quality_checks
    WHERE ($1::date IS NULL OR checked_at >= $1::date)
      AND ($2::date IS NULL OR checked_at <= $2::date)
  `, [from_date || null, to_date || null]);

  // Defects stats
  const defectsResult = await query(`
    SELECT
      COUNT(*) as total_defects,
      COUNT(*) FILTER (WHERE status = 'open') as open,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical,
      COUNT(*) FILTER (WHERE severity = 'major') as major,
      COUNT(*) FILTER (WHERE severity = 'minor') as minor,
      COUNT(*) FILTER (WHERE severity = 'cosmetic') as cosmetic,
      COALESCE(SUM(cost_impact), 0) as total_cost_impact
    FROM defects
    WHERE ($1::date IS NULL OR created_at >= $1::date)
      AND ($2::date IS NULL OR created_at <= $2::date)
  `, [from_date || null, to_date || null]);

  // Defects by type
  const defectsByType = await query(`
    SELECT defect_type, COUNT(*) as count
    FROM defects
    WHERE ($1::date IS NULL OR created_at >= $1::date)
      AND ($2::date IS NULL OR created_at <= $2::date)
    GROUP BY defect_type
    ORDER BY count DESC
    LIMIT 10
  `, [from_date || null, to_date || null]);

  // Calculate pass rate
  const checks = checksResult.rows[0];
  const totalCompleted = Number(checks.passed) + Number(checks.failed);
  const passRate = totalCompleted > 0 ? (Number(checks.passed) / totalCompleted * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: {
      checks: {
        ...checks,
        pass_rate: passRate,
      },
      defects: defectsResult.rows[0],
      defects_by_type: defectsByType.rows,
    },
  });
});
