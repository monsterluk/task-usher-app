import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// ============ PRODUCTION BATCHES ============

// GET /api/traceability/batches
export const getBatches = asyncHandler(async (req: Request, res: Response) => {
  const { order_id, status, quality_status, search, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT pb.*,
           o.order_number,
           o.client_name,
           w.name as created_by_name,
           (SELECT COUNT(*) FROM batch_materials bm WHERE bm.batch_id = pb.id) as materials_count,
           (SELECT COUNT(*) FROM production_events pe WHERE pe.batch_id = pb.id) as events_count
    FROM production_batches pb
    LEFT JOIN orders o ON pb.order_id = o.id
    LEFT JOIN workers w ON pb.created_by = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (order_id) {
    sql += ` AND pb.order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (status) {
    sql += ` AND pb.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (quality_status) {
    sql += ` AND pb.quality_status = $${paramIndex}`;
    params.push(quality_status);
    paramIndex++;
  }

  if (search) {
    sql += ` AND (pb.batch_number ILIKE $${paramIndex} OR pb.product_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  sql += ` ORDER BY pb.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { batches: result.rows },
  });
});

// GET /api/traceability/batches/:id
export const getBatchById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const batchResult = await query(
    `SELECT pb.*, o.order_number, o.client_name, o.product_name as order_product,
            w.name as created_by_name
     FROM production_batches pb
     LEFT JOIN orders o ON pb.order_id = o.id
     LEFT JOIN workers w ON pb.created_by = w.id
     WHERE pb.id = $1`,
    [id]
  );

  if (batchResult.rows.length === 0) {
    throw new AppError('Partia nie znaleziona', 404);
  }

  // Get materials
  const materialsResult = await query(
    `SELECT bm.*, w.name as added_by_name
     FROM batch_materials bm
     LEFT JOIN workers w ON bm.added_by = w.id
     WHERE bm.batch_id = $1
     ORDER BY bm.added_at DESC`,
    [id]
  );

  // Get events (genealogy)
  const eventsResult = await query(
    `SELECT pe.*, w.name as recorded_by_name, s.stage_name
     FROM production_events pe
     LEFT JOIN workers w ON pe.recorded_by = w.id
     LEFT JOIN stages s ON pe.stage_id = s.id
     WHERE pe.batch_id = $1
     ORDER BY pe.recorded_at DESC`,
    [id]
  );

  // Get machine parameters
  const paramsResult = await query(
    `SELECT mp.*, m.name as machine_name, w.name as recorded_by_name
     FROM machine_parameters mp
     LEFT JOIN machines m ON mp.machine_id = m.id
     LEFT JOIN workers w ON mp.recorded_by = w.id
     WHERE mp.batch_id = $1
     ORDER BY mp.recorded_at DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      batch: batchResult.rows[0],
      materials: materialsResult.rows,
      events: eventsResult.rows,
      machine_parameters: paramsResult.rows,
    },
  });
});

// POST /api/traceability/batches
export const createBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batch_number, order_id, product_name, quantity, notes } = req.body;

  if (!batch_number) {
    throw new AppError('Numer partii jest wymagany', 400);
  }

  // Check for duplicate batch number
  const existingBatch = await query('SELECT id FROM production_batches WHERE batch_number = $1', [batch_number]);
  if (existingBatch.rows.length > 0) {
    throw new AppError('Partia o tym numerze już istnieje', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO production_batches (batch_number, order_id, product_name, quantity, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [batch_number, order_id, product_name, quantity || 1, notes, req.user?.id]
    );

    const batch = result.rows[0];

    // Log event
    await client.query(
      `INSERT INTO production_events (batch_id, order_id, event_type, event_description, recorded_by)
       VALUES ($1, $2, 'batch_created', $3, $4)`,
      [batch.id, order_id, `Utworzono partię ${batch_number}`, req.user?.id]
    );

    await client.query('COMMIT');

    logger.info(`Batch created: ${batch_number}`);

    res.status(201).json({
      success: true,
      data: { batch },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// PUT /api/traceability/batches/:id
export const updateBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, quality_status, notes } = req.body;

  const existingResult = await query('SELECT * FROM production_batches WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Partia nie znaleziona', 404);
  }

  const batch = existingResult.rows[0];
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;

    if (status === 'completed' && batch.status !== 'completed') {
      updates.push(`completed_at = NOW()`);
    }
  }

  if (quality_status !== undefined) {
    updates.push(`quality_status = $${paramIndex}`);
    params.push(quality_status);
    paramIndex++;
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(notes);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new AppError('Brak pól do aktualizacji', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE production_batches SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  // Log status change event
  if (status && status !== batch.status) {
    const eventType = status === 'completed' ? 'batch_completed' :
                      status === 'rejected' ? 'batch_rejected' :
                      status === 'on_hold' ? 'batch_on_hold' : 'note_added';

    await query(
      `INSERT INTO production_events (batch_id, order_id, event_type, event_description, recorded_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, batch.order_id, eventType, `Status zmieniony na: ${status}`, req.user?.id]
    );
  }

  res.json({
    success: true,
    data: { batch: result.rows[0] },
  });
});

// ============ BATCH MATERIALS ============

// POST /api/traceability/batches/:batchId/materials
export const addBatchMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const { material_name, material_lot, supplier, quantity_used, unit, expiry_date, certificate_number, order_bom_item_id } = req.body;

  if (!material_name || !quantity_used || !unit) {
    throw new AppError('Nazwa materiału, ilość i jednostka są wymagane', 400);
  }

  const batchResult = await query('SELECT id, order_id FROM production_batches WHERE id = $1', [batchId]);
  if (batchResult.rows.length === 0) {
    throw new AppError('Partia nie znaleziona', 404);
  }

  const batch = batchResult.rows[0];

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO batch_materials
       (batch_id, material_name, material_lot, supplier, quantity_used, unit, expiry_date, certificate_number, order_bom_item_id, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [batchId, material_name, material_lot, supplier, quantity_used, unit, expiry_date, certificate_number, order_bom_item_id, req.user?.id]
    );

    // Log event
    await client.query(
      `INSERT INTO production_events (batch_id, order_id, event_type, event_description, event_data, recorded_by)
       VALUES ($1, $2, 'material_added', $3, $4, $5)`,
      [
        batchId,
        batch.order_id,
        `Dodano materiał: ${material_name} (${quantity_used} ${unit})`,
        JSON.stringify({ material_lot, supplier, quantity: quantity_used }),
        req.user?.id,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: { material: result.rows[0] },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// ============ PRODUCTION EVENTS ============

// GET /api/orders/:orderId/events
export const getOrderEvents = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { event_type, limit = 100, offset = 0 } = req.query;

  let sql = `
    SELECT pe.*, w.name as recorded_by_name, s.stage_name, pb.batch_number
    FROM production_events pe
    LEFT JOIN workers w ON pe.recorded_by = w.id
    LEFT JOIN stages s ON pe.stage_id = s.id
    LEFT JOIN production_batches pb ON pe.batch_id = pb.id
    WHERE pe.order_id = $1
  `;
  const params: any[] = [orderId];
  let paramIndex = 2;

  if (event_type) {
    sql += ` AND pe.event_type = $${paramIndex}`;
    params.push(event_type);
    paramIndex++;
  }

  sql += ` ORDER BY pe.recorded_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { events: result.rows },
  });
});

// POST /api/traceability/events
export const recordEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batch_id, order_id, stage_id, event_type, event_description, event_data } = req.body;

  if (!event_type) {
    throw new AppError('Typ zdarzenia jest wymagany', 400);
  }

  const result = await query(
    `INSERT INTO production_events (batch_id, order_id, stage_id, event_type, event_description, event_data, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [batch_id, order_id, stage_id, event_type, event_description, event_data ? JSON.stringify(event_data) : null, req.user?.id]
  );

  res.status(201).json({
    success: true,
    data: { event: result.rows[0] },
  });
});

// ============ MACHINE PARAMETERS ============

// POST /api/traceability/parameters
export const recordMachineParameter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batch_id, order_id, machine_id, parameter_name, parameter_value, unit, min_value, max_value } = req.body;

  if (!parameter_name || parameter_value === undefined) {
    throw new AppError('Nazwa parametru i wartość są wymagane', 400);
  }

  // Check if within spec
  let isWithinSpec = true;
  const numValue = parseFloat(parameter_value);
  if (!isNaN(numValue)) {
    if (min_value !== undefined && numValue < min_value) isWithinSpec = false;
    if (max_value !== undefined && numValue > max_value) isWithinSpec = false;
  }

  const result = await query(
    `INSERT INTO machine_parameters
     (batch_id, order_id, machine_id, parameter_name, parameter_value, unit, min_value, max_value, is_within_spec, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [batch_id, order_id, machine_id, parameter_name, parameter_value, unit, min_value, max_value, isWithinSpec, req.user?.id]
  );

  // If out of spec, log event
  if (!isWithinSpec) {
    await query(
      `INSERT INTO production_events (batch_id, order_id, event_type, event_description, event_data, recorded_by)
       VALUES ($1, $2, 'parameter_recorded', $3, $4, $5)`,
      [
        batch_id,
        order_id,
        `Parametr poza specyfikacją: ${parameter_name} = ${parameter_value} (zakres: ${min_value}-${max_value})`,
        JSON.stringify({ parameter_name, value: parameter_value, min: min_value, max: max_value }),
        req.user?.id,
      ]
    );
  }

  res.status(201).json({
    success: true,
    data: { parameter: result.rows[0] },
  });
});

// GET /api/traceability/genealogy/:batchNumber - Full genealogy report
export const getGenealogy = asyncHandler(async (req: Request, res: Response) => {
  const { batchNumber } = req.params;

  const batchResult = await query(
    `SELECT pb.*, o.order_number, o.client_name, o.product_name as order_product
     FROM production_batches pb
     LEFT JOIN orders o ON pb.order_id = o.id
     WHERE pb.batch_number = $1`,
    [batchNumber]
  );

  if (batchResult.rows.length === 0) {
    throw new AppError('Partia nie znaleziona', 404);
  }

  const batch = batchResult.rows[0];

  // Get all materials with lot numbers
  const materials = await query(
    `SELECT bm.*, w.name as added_by_name
     FROM batch_materials bm
     LEFT JOIN workers w ON bm.added_by = w.id
     WHERE bm.batch_id = $1`,
    [batch.id]
  );

  // Get complete event timeline
  const events = await query(
    `SELECT pe.*, w.name as recorded_by_name, s.stage_name
     FROM production_events pe
     LEFT JOIN workers w ON pe.recorded_by = w.id
     LEFT JOIN stages s ON pe.stage_id = s.id
     WHERE pe.batch_id = $1
     ORDER BY pe.recorded_at ASC`,
    [batch.id]
  );

  // Get all machine parameters
  const parameters = await query(
    `SELECT mp.*, m.name as machine_name
     FROM machine_parameters mp
     LEFT JOIN machines m ON mp.machine_id = m.id
     WHERE mp.batch_id = $1
     ORDER BY mp.recorded_at ASC`,
    [batch.id]
  );

  // Get work sessions (who worked on it)
  const workSessions = await query(
    `SELECT ws.*, w.name as worker_name, s.stage_name
     FROM work_sessions ws
     JOIN assignments a ON ws.assignment_id = a.id
     JOIN workers w ON a.worker_id = w.id
     JOIN stages s ON a.stage_id = s.id
     WHERE s.order_id = $1
     ORDER BY ws.start_time ASC`,
    [batch.order_id]
  );

  // Get quality checks
  const qualityChecks = await query(
    `SELECT qc.*, qcp.name as checkpoint_name, w.name as checked_by_name
     FROM quality_checks qc
     LEFT JOIN qc_checkpoints qcp ON qc.checkpoint_id = qcp.id
     LEFT JOIN workers w ON qc.checked_by = w.id
     WHERE qc.order_id = $1
     ORDER BY qc.checked_at ASC`,
    [batch.order_id]
  );

  // Get defects
  const defects = await query(
    `SELECT d.*, w1.name as reported_by_name, w2.name as resolved_by_name
     FROM defects d
     LEFT JOIN workers w1 ON d.reported_by = w1.id
     LEFT JOIN workers w2 ON d.resolved_by = w2.id
     WHERE d.order_id = $1
     ORDER BY d.created_at ASC`,
    [batch.order_id]
  );

  res.json({
    success: true,
    data: {
      batch,
      genealogy: {
        materials: materials.rows,
        events: events.rows,
        machine_parameters: parameters.rows,
        work_sessions: workSessions.rows,
        quality_checks: qualityChecks.rows,
        defects: defects.rows,
      },
    },
  });
});

// Helper: Generate unique batch number
export const generateBatchNumber = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

  const lastBatch = await query(
    `SELECT batch_number FROM production_batches
     WHERE batch_number LIKE $1
     ORDER BY batch_number DESC LIMIT 1`,
    [`${datePrefix}-%`]
  );

  let sequence = 1;
  if (lastBatch.rows.length > 0) {
    const lastSeq = parseInt(lastBatch.rows[0].batch_number.split('-')[1]) || 0;
    sequence = lastSeq + 1;
  }

  const batchNumber = `${datePrefix}-${String(sequence).padStart(4, '0')}`;

  res.json({
    success: true,
    data: { batch_number: batchNumber },
  });
});
