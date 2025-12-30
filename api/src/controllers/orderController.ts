import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest, Order } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logAudit, getAuditContextFromRequest } from '../services/auditService';

// Default stages for new orders
const DEFAULT_STAGES = [
  { stage_number: 1, stage_name: 'HANDLOWIEC', is_required: true },
  { stage_number: 2, stage_name: 'GRAFIK', is_required: true },
  { stage_number: 3, stage_name: 'FREZOWANIE/LASER', is_required: true },
  { stage_number: 4, stage_name: 'POLEROWANIE', is_required: false },
  { stage_number: 5, stage_name: 'WYGINANIE', is_required: false },
  { stage_number: 6, stage_name: 'KLEJENIE', is_required: false },
  { stage_number: 7, stage_name: 'DRUKOWANIE', is_required: false },
  { stage_number: 8, stage_name: 'OKLEJANIE', is_required: false },
  { stage_number: 9, stage_name: 'PAKOWANIE', is_required: true },
  { stage_number: 10, stage_name: 'WYSYŁKA', is_required: true },
  { stage_number: 11, stage_name: 'FAKTURA', is_required: true },
  { stage_number: 12, stage_name: 'ZAMKNIĘCIE', is_required: true },
];

// GET /api/orders
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, archived, limit = 50, offset = 0, search } = req.query;

  let sql = `
    SELECT
      o.*,
      (SELECT COUNT(*) FROM stages s WHERE s.order_id = o.id) as stages_count,
      (SELECT COUNT(*) FROM stages s WHERE s.order_id = o.id AND s.status = 'GOTOWY') as completed_stages_count
    FROM orders o
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (status) {
    sql += ` AND o.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (archived !== undefined) {
    sql += ` AND o.archived = $${paramIndex}`;
    params.push(archived === 'true');
    paramIndex++;
  }

  if (search) {
    sql += ` AND (
      o.order_number ILIKE $${paramIndex} OR
      o.client_name ILIKE $${paramIndex} OR
      o.product_name ILIKE $${paramIndex} OR
      o.client_order_number ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Get total count
  const countSql = sql.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Add pagination and ordering
  sql += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      orders: result.rows,
      total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
});

// GET /api/orders/:id
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Get order
  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  const order = orderResult.rows[0];

  // Get stages with assignments
  const stagesResult = await query(
    `SELECT
      s.*,
      json_agg(
        CASE WHEN a.id IS NOT NULL THEN
          json_build_object(
            'id', a.id,
            'worker_id', a.worker_id,
            'worker_name', w.name,
            'status', a.status,
            'assigned_at', a.assigned_at,
            'completed_at', a.completed_at
          )
        ELSE NULL END
      ) FILTER (WHERE a.id IS NOT NULL) as assignments
    FROM stages s
    LEFT JOIN assignments a ON s.id = a.stage_id
    LEFT JOIN workers w ON a.worker_id = w.id
    WHERE s.order_id = $1
    GROUP BY s.id
    ORDER BY s.sequence_order ASC`,
    [id]
  );

  // Get shipments
  const shipmentsResult = await query(
    'SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC',
    [id]
  );

  res.json({
    success: true,
    data: {
      order,
      stages: stagesResult.rows,
      shipments: shipmentsResult.rows,
    },
  });
});

// POST /api/orders
export const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    order_number,
    client_order_number,
    client_name,
    client_email,
    client_phone,
    product_name,
    quantity,
    price_total,
    price_per_unit,
    planned_completion_date,
    notes,
    folder_path,
    invoice_number,
    invoice_date,
    stages: customStages,
    priority,
  } = req.body;

  if (!order_number || !client_name || !product_name) {
    throw new AppError('Order number, client name, and product name are required', 400);
  }

  // Check if order number already exists
  const existingOrder = await query(
    'SELECT id FROM orders WHERE order_number = $1',
    [order_number]
  );

  if (existingOrder.rows.length > 0) {
    throw new AppError('Order with this number already exists', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, client_order_number, client_name, client_email, client_phone,
        product_name, quantity, price_total, price_per_unit, status, priority,
        planned_completion_date, notes, folder_path, invoice_number, invoice_date,
        created_by, archived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'NOWE', $10, $11, $12, $13, $14, $15, $16, false)
      RETURNING *`,
      [
        order_number,
        client_order_number,
        client_name,
        client_email,
        client_phone,
        product_name,
        quantity,
        price_total,
        price_per_unit,
        priority || 'NORMAL',
        planned_completion_date,
        notes,
        folder_path,
        invoice_number,
        invoice_date,
        req.user?.email || 'system',
      ]
    );

    const order = orderResult.rows[0];

    // Create stages
    const stagesToCreate = customStages || DEFAULT_STAGES;

    for (let i = 0; i < stagesToCreate.length; i++) {
      const stage = stagesToCreate[i];
      await client.query(
        `INSERT INTO stages (order_id, stage_number, stage_name, is_required, status, sequence_order)
         VALUES ($1, $2, $3, $4, 'NOWY', $5)`,
        [
          order.id,
          stage.stage_number,
          stage.stage_name,
          stage.is_required !== false,
          i + 1,
        ]
      );
    }

    await client.query('COMMIT');

    // Get full order with stages
    const fullOrderResult = await query(
      `SELECT * FROM orders WHERE id = $1`,
      [order.id]
    );

    const stagesResult = await query(
      `SELECT * FROM stages WHERE order_id = $1 ORDER BY sequence_order`,
      [order.id]
    );

    logger.info(`Order created: ${order_number}`);

    // Audit log
    await logAudit({
      tableName: 'orders',
      recordId: order.id,
      action: 'CREATE',
      newValues: fullOrderResult.rows[0],
      context: getAuditContextFromRequest(req),
    });

    res.status(201).json({
      success: true,
      data: {
        order: fullOrderResult.rows[0],
        stages: stagesResult.rows,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id
export const updateOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    order_number,
    client_order_number,
    client_name,
    client_email,
    client_phone,
    product_name,
    quantity,
    price_total,
    price_per_unit,
    status,
    planned_completion_date,
    notes,
    folder_path,
    invoice_number,
    invoice_date,
    archived,
    priority,
  } = req.body;

  // Check if order exists
  const existingResult = await query('SELECT * FROM orders WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  // If order_number is being changed, check for duplicates
  if (order_number) {
    const duplicateCheck = await query(
      'SELECT id FROM orders WHERE order_number = $1 AND id != $2',
      [order_number, id]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new AppError('Order number already in use', 400);
    }
  }

  // Build update query
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fields: Record<string, any> = {
    order_number,
    client_order_number,
    client_name,
    client_email,
    client_phone,
    product_name,
    quantity,
    price_total,
    price_per_unit,
    status,
    priority,
    planned_completion_date,
    notes,
    folder_path,
    invoice_number,
    invoice_date,
    archived,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  // If status is changing to GOTOWE, set closed_at
  if (status === 'GOTOWE' && existingResult.rows[0].status !== 'GOTOWE') {
    updates.push(`closed_at = NOW()`);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `
    UPDATE orders
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(sql, params);

  logger.info(`Order updated: ${result.rows[0].order_number}`);

  // Audit log
  await logAudit({
    tableName: 'orders',
    recordId: Number(id),
    action: 'UPDATE',
    oldValues: existingResult.rows[0],
    newValues: result.rows[0],
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: {
      order: result.rows[0],
    },
  });
});

// DELETE /api/orders/:id
export const deleteOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check if order exists
  const existingResult = await query(
    'SELECT order_number FROM orders WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  // Audit log before delete
  await logAudit({
    tableName: 'orders',
    recordId: Number(id),
    action: 'DELETE',
    oldValues: existingResult.rows[0],
    context: getAuditContextFromRequest(req),
  });

  // Delete order (cascades to stages, assignments, work_sessions)
  await query('DELETE FROM orders WHERE id = $1', [id]);

  logger.info(`Order deleted: ${existingResult.rows[0].order_number}`);

  res.json({
    success: true,
    message: 'Order deleted successfully',
  });
});

// POST /api/orders/:id/archive
export const archiveOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `UPDATE orders SET archived = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  logger.info(`Order archived: ${result.rows[0].order_number}`);

  // Audit log
  await logAudit({
    tableName: 'orders',
    recordId: Number(id),
    action: 'ARCHIVE',
    newValues: { archived: true },
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: {
      order: result.rows[0],
    },
  });
});

// POST /api/orders/:id/unarchive
export const unarchiveOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `UPDATE orders SET archived = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  logger.info(`Order unarchived: ${result.rows[0].order_number}`);

  // Audit log
  await logAudit({
    tableName: 'orders',
    recordId: Number(id),
    action: 'RESTORE',
    newValues: { archived: false },
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: {
      order: result.rows[0],
    },
  });
});
