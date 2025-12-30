import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// ============ MATERIAL PRICES ============

// GET /api/admin/materials
export const getMaterialPrices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, active_only } = req.query;

  let sql = `SELECT * FROM material_prices WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (type) {
    sql += ` AND material_type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (active_only === 'true') {
    sql += ` AND active = true`;
  }

  sql += ` ORDER BY material_type, name`;

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { materials: result.rows }
  });
});

// POST /api/admin/materials
export const createMaterialPrice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { material_type, name, unit, price_per_unit, supplier, min_order_quantity, lead_time_days, notes } = req.body;

  if (!material_type || !name || !unit || price_per_unit === undefined) {
    throw new AppError('Typ materialu, nazwa, jednostka i cena sa wymagane', 400);
  }

  const result = await query(`
    INSERT INTO material_prices (material_type, name, unit, price_per_unit, supplier, min_order_quantity, lead_time_days, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [material_type, name, unit, price_per_unit, supplier, min_order_quantity, lead_time_days, notes, userId]);

  logger.info(`Material price created: ${name} by user ${userId}`);

  res.status(201).json({
    success: true,
    data: { material: result.rows[0] }
  });
});

// PUT /api/admin/materials/:id
export const updateMaterialPrice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { material_type, name, unit, price_per_unit, supplier, min_order_quantity, lead_time_days, notes, active } = req.body;

  const result = await query(`
    UPDATE material_prices
    SET material_type = COALESCE($1, material_type),
        name = COALESCE($2, name),
        unit = COALESCE($3, unit),
        price_per_unit = COALESCE($4, price_per_unit),
        supplier = $5,
        min_order_quantity = $6,
        lead_time_days = $7,
        notes = $8,
        active = COALESCE($9, active),
        updated_at = NOW()
    WHERE id = $10
    RETURNING *
  `, [material_type, name, unit, price_per_unit, supplier, min_order_quantity, lead_time_days, notes, active, id]);

  if (result.rows.length === 0) {
    throw new AppError('Material nie znaleziony', 404);
  }

  res.json({
    success: true,
    data: { material: result.rows[0] }
  });
});

// DELETE /api/admin/materials/:id
export const deleteMaterialPrice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query('DELETE FROM material_prices WHERE id = $1 RETURNING id', [id]);

  if (result.rows.length === 0) {
    throw new AppError('Material nie znaleziony', 404);
  }

  res.json({
    success: true,
    message: 'Material usuniety'
  });
});

// ============ PRODUCTION SETTINGS ============

// GET /api/admin/settings
export const getProductionSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(`
    SELECT ps.*, w.name as updated_by_name
    FROM production_settings ps
    LEFT JOIN workers w ON w.id = ps.updated_by
    ORDER BY ps.setting_key
  `);

  // Convert to key-value format for easier frontend use
  const settingsMap: { [key: string]: any } = {};
  result.rows.forEach(row => {
    settingsMap[row.setting_key] = {
      id: row.id,
      value: parseFloat(row.setting_value),
      type: row.setting_type,
      description: row.description,
      updated_by: row.updated_by_name,
      updated_at: row.updated_at
    };
  });

  res.json({
    success: true,
    data: {
      settings: settingsMap,
      raw: result.rows
    }
  });
});

// PUT /api/admin/settings/:key
export const updateProductionSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { key } = req.params;
  const { value, description } = req.body;

  if (value === undefined) {
    throw new AppError('Wartosc jest wymagana', 400);
  }

  const result = await query(`
    UPDATE production_settings
    SET setting_value = $1,
        description = COALESCE($2, description),
        updated_by = $3,
        updated_at = NOW()
    WHERE setting_key = $4
    RETURNING *
  `, [value, description, userId, key]);

  if (result.rows.length === 0) {
    // If setting doesn't exist, create it
    const insertResult = await query(`
      INSERT INTO production_settings (setting_key, setting_value, setting_type, description, updated_by)
      VALUES ($1, $2, 'fixed', $3, $4)
      RETURNING *
    `, [key, value, description || key, userId]);

    return res.json({
      success: true,
      data: { setting: insertResult.rows[0] }
    });
  }

  logger.info(`Production setting updated: ${key} = ${value} by user ${userId}`);

  res.json({
    success: true,
    data: { setting: result.rows[0] }
  });
});

// PUT /api/admin/settings (batch update)
export const updateProductionSettingsBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    throw new AppError('Settings object jest wymagany', 400);
  }

  const updated = [];
  for (const [key, value] of Object.entries(settings)) {
    const result = await query(`
      UPDATE production_settings
      SET setting_value = $1,
          updated_by = $2,
          updated_at = NOW()
      WHERE setting_key = $3
      RETURNING *
    `, [value, userId, key]);

    if (result.rows.length > 0) {
      updated.push(result.rows[0]);
    }
  }

  logger.info(`Production settings batch updated: ${Object.keys(settings).join(', ')} by user ${userId}`);

  res.json({
    success: true,
    data: { updated },
    message: `Zaktualizowano ${updated.length} ustawien`
  });
});

// ============ DASHBOARD STATS ============

// GET /api/admin/stats
export const getAdminStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await query(`
    SELECT
      (SELECT COUNT(*) FROM workers WHERE active = true) as active_workers,
      (SELECT COUNT(*) FROM workers) as total_workers,
      (SELECT COUNT(*) FROM orders WHERE status = 'NOWE') as new_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'W_TRAKCIE') as in_progress_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'GOTOWE' AND archived = false) as completed_orders,
      (SELECT COUNT(*) FROM orders WHERE archived = true) as archived_orders,
      (SELECT COUNT(*) FROM machines WHERE active = true) as active_machines,
      (SELECT COALESCE(SUM(price_total), 0) FROM orders WHERE status != 'ANULOWANE' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
      (SELECT COALESCE(SUM(price_total), 0) FROM orders WHERE status != 'ANULOWANE' AND created_at >= DATE_TRUNC('year', CURRENT_DATE)) as yearly_revenue,
      (SELECT COUNT(*) FROM orders WHERE planned_completion_date < NOW() AND status NOT IN ('GOTOWE', 'ANULOWANE')) as overdue_orders,
      (SELECT COUNT(*) FROM material_prices WHERE active = true) as active_materials,
      (SELECT COUNT(*) FROM notifications WHERE is_read = false) as unread_notifications
  `);

  res.json({
    success: true,
    data: stats.rows[0]
  });
});

// GET /api/admin/activity
export const getRecentActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;

  const activity = await query(`
    SELECT
      al.*,
      w.name as user_name
    FROM audit_logs al
    LEFT JOIN workers w ON w.id = al.user_id
    ORDER BY al.created_at DESC
    LIMIT $1
  `, [limit]);

  res.json({
    success: true,
    data: { activity: activity.rows }
  });
});
