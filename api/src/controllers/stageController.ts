import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// GET /api/orders/:orderId/stages
export const getOrderStages = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  // Check if order exists
  const orderResult = await query('SELECT id FROM orders WHERE id = $1', [orderId]);

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  const stagesResult = await query(
    `SELECT
      s.*,
      json_agg(
        CASE WHEN a.id IS NOT NULL THEN
          json_build_object(
            'id', a.id,
            'worker_id', a.worker_id,
            'worker_name', w.name,
            'worker_position', w.position,
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
    [orderId]
  );

  res.json({
    success: true,
    data: {
      stages: stagesResult.rows,
    },
  });
});

// GET /api/stages/:id
export const getStageById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const stageResult = await query(
    `SELECT
      s.*,
      o.order_number,
      o.client_name,
      o.product_name
    FROM stages s
    JOIN orders o ON s.order_id = o.id
    WHERE s.id = $1`,
    [id]
  );

  if (stageResult.rows.length === 0) {
    throw new AppError('Stage not found', 404);
  }

  // Get assignments with work sessions
  const assignmentsResult = await query(
    `SELECT
      a.*,
      w.name as worker_name,
      w.position as worker_position,
      w.hourly_rate,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ws.id,
            'start_time', ws.start_time,
            'end_time', ws.end_time,
            'duration_minutes', ws.duration_minutes,
            'cost', ws.cost
          )
        ) FILTER (WHERE ws.id IS NOT NULL),
        '[]'
      ) as work_sessions
    FROM assignments a
    JOIN workers w ON a.worker_id = w.id
    LEFT JOIN work_sessions ws ON a.id = ws.assignment_id
    WHERE a.stage_id = $1
    GROUP BY a.id, w.name, w.position, w.hourly_rate`,
    [id]
  );

  res.json({
    success: true,
    data: {
      stage: stageResult.rows[0],
      assignments: assignmentsResult.rows,
    },
  });
});

// POST /api/orders/:orderId/stages
export const createStage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { stage_number, stage_name, is_required = true } = req.body;

  if (!stage_name) {
    throw new AppError('Stage name is required', 400);
  }

  // Check if order exists
  const orderResult = await query('SELECT id FROM orders WHERE id = $1', [orderId]);

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  // Get max sequence order
  const maxSeqResult = await query(
    'SELECT MAX(sequence_order) as max_seq FROM stages WHERE order_id = $1',
    [orderId]
  );

  const nextSeqOrder = (maxSeqResult.rows[0].max_seq || 0) + 1;

  const result = await query(
    `INSERT INTO stages (order_id, stage_number, stage_name, is_required, status, sequence_order)
     VALUES ($1, $2, $3, $4, 'NOWY', $5)
     RETURNING *`,
    [orderId, stage_number || nextSeqOrder, stage_name, is_required, nextSeqOrder]
  );

  logger.info(`Stage created: ${stage_name} for order ${orderId}`);

  res.status(201).json({
    success: true,
    data: {
      stage: result.rows[0],
    },
  });
});

// PUT /api/stages/:id
export const updateStage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { stage_name, is_required, status, sequence_order } = req.body;

  // Check if stage exists
  const existingResult = await query(
    'SELECT s.*, o.id as order_id FROM stages s JOIN orders o ON s.order_id = o.id WHERE s.id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new AppError('Stage not found', 404);
  }

  const existingStage = existingResult.rows[0];

  // Build update query
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (stage_name !== undefined) {
    updates.push(`stage_name = $${paramIndex}`);
    params.push(stage_name);
    paramIndex++;
  }

  if (is_required !== undefined) {
    updates.push(`is_required = $${paramIndex}`);
    params.push(is_required);
    paramIndex++;
  }

  if (status !== undefined) {
    // TASK 1.2: Validate stage sequence - check if previous stages are completed
    const isCompleting = (status === 'GOTOWY' || status === 'ZAKONCZONE') &&
                         existingStage.status !== 'GOTOWY' &&
                         existingStage.status !== 'ZAKONCZONE';

    if (isCompleting) {
      const previousIncompleteResult = await query(
        `SELECT stage_name, status, sequence_order
         FROM stages
         WHERE order_id = $1
           AND sequence_order < $2
           AND is_sequential = true
           AND is_required = true
           AND status NOT IN ('GOTOWY', 'ZAKONCZONE')
         ORDER BY sequence_order`,
        [existingStage.order_id, existingStage.sequence_order]
      );

      if (previousIncompleteResult.rows.length > 0) {
        const incompleteList = previousIncompleteResult.rows
          .map((s: any) => `${s.stage_name} (${s.status})`)
          .join(', ');
        throw new AppError(
          `Nie można zakończyć etapu. Najpierw zakończ poprzednie wymagane etapy: ${incompleteList}`,
          400
        );
      }

      // Set completed_at timestamp for both GOTOWY and ZAKONCZONE
      updates.push(`completed_at = NOW()`);
    }

    // Set started_at when stage starts
    if ((status === 'W_TRAKCIE' || status === 'W TRAKCIE') && existingStage.status === 'NOWY') {
      updates.push(`started_at = NOW()`);
    }

    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (sequence_order !== undefined) {
    updates.push(`sequence_order = $${paramIndex}`);
    params.push(sequence_order);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `
    UPDATE stages
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(sql, params);

  // If stage status changed, update order status
  if (status && status !== existingStage.status) {
    await updateOrderStatusFromStages(existingStage.order_id);
  }

  logger.info(`Stage updated: ${result.rows[0].stage_name}`);

  res.json({
    success: true,
    data: {
      stage: result.rows[0],
    },
  });
});

// DELETE /api/stages/:id
export const deleteStage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check if stage exists
  const existingResult = await query(
    'SELECT stage_name FROM stages WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new AppError('Stage not found', 404);
  }

  // Delete stage (cascades to assignments and work_sessions)
  await query('DELETE FROM stages WHERE id = $1', [id]);

  logger.info(`Stage deleted: ${existingResult.rows[0].stage_name}`);

  res.json({
    success: true,
    message: 'Stage deleted successfully',
  });
});

// Helper function to update order status based on stages
export const updateOrderStatusFromStages = async (orderId: number): Promise<void> => {
  const stagesResult = await query(
    'SELECT status FROM stages WHERE order_id = $1 AND is_required = true',
    [orderId]
  );

  const stages = stagesResult.rows;

  if (stages.length === 0) {
    return;
  }

  // Both GOTOWY and ZAKONCZONE count as completed
  const allCompleted = stages.every((s) => s.status === 'GOTOWY' || s.status === 'ZAKONCZONE');
  const anyInProgress = stages.some(
    (s) => s.status === 'W_TRAKCIE' || s.status === 'GOTOWY' || s.status === 'ZAKONCZONE'
  );

  let newStatus = 'NOWE';

  if (allCompleted) {
    newStatus = 'GOTOWE';
  } else if (anyInProgress) {
    newStatus = 'W_TRAKCIE';
  }

  await query(
    `UPDATE orders SET status = $1, updated_at = NOW()${newStatus === 'GOTOWE' ? ', closed_at = NOW()' : ''} WHERE id = $2`,
    [newStatus, orderId]
  );

  logger.info(`Order ${orderId} status updated to ${newStatus}`);
};

// ============ STANDARD TIMES (TPZ, TJ) ============

// GET /api/stages/time-standards
export const getTimeStandards = asyncHandler(async (req: Request, res: Response) => {
  const { stage_name, active } = req.query;

  let sql = `SELECT * FROM stage_time_standards WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (stage_name) {
    sql += ` AND stage_name = $${paramIndex}`;
    params.push(stage_name);
    paramIndex++;
  }

  if (active !== undefined) {
    sql += ` AND active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  sql += ' ORDER BY stage_name ASC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { standards: result.rows },
  });
});

// POST /api/stages/time-standards
export const createTimeStandard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { stage_name, tpz_minutes, tj_minutes, description, machine_type, complexity_factor } = req.body;

  if (!stage_name) {
    throw new AppError('Nazwa etapu jest wymagana', 400);
  }

  const result = await query(
    `INSERT INTO stage_time_standards (stage_name, tpz_minutes, tj_minutes, description, machine_type, complexity_factor, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [stage_name, tpz_minutes || 0, tj_minutes || 0, description, machine_type, complexity_factor || 1.0, req.user?.id]
  );

  res.status(201).json({
    success: true,
    data: { standard: result.rows[0] },
  });
});

// PUT /api/stages/time-standards/:id
export const updateTimeStandard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { tpz_minutes, tj_minutes, description, machine_type, complexity_factor, active } = req.body;

  const existingResult = await query('SELECT id FROM stage_time_standards WHERE id = $1', [id]);
  if (existingResult.rows.length === 0) {
    throw new AppError('Standard nie znaleziony', 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fields: Record<string, any> = { tpz_minutes, tj_minutes, description, machine_type, complexity_factor, active };

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

  const result = await query(
    `UPDATE stage_time_standards SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  res.json({
    success: true,
    data: { standard: result.rows[0] },
  });
});

// Helper: Calculate planned duration for a stage
export const calculateStagePlannedDuration = (tpz: number, tj: number, quantity: number): number => {
  return tpz + (tj * quantity);
};

// PUT /api/stages/:id/times - Update stage times with efficiency calculation
export const updateStageTimes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { tpz_minutes, tj_minutes } = req.body;

  // Get stage with order quantity
  const stageResult = await query(
    `SELECT s.*, o.quantity FROM stages s
     JOIN orders o ON s.order_id = o.id
     WHERE s.id = $1`,
    [id]
  );

  if (stageResult.rows.length === 0) {
    throw new AppError('Stage not found', 404);
  }

  const stage = stageResult.rows[0];
  const tpz = tpz_minutes !== undefined ? tpz_minutes : (parseFloat(stage.tpz_minutes) || 0);
  const tj = tj_minutes !== undefined ? tj_minutes : (parseFloat(stage.tj_minutes) || 0);
  const quantity = stage.quantity || 1;

  // Calculate planned duration
  const plannedDuration = calculateStagePlannedDuration(tpz, tj, quantity);

  // Get actual duration from work sessions
  const sessionsResult = await query(
    `SELECT COALESCE(SUM(ws.duration_minutes), 0) as total_minutes
     FROM work_sessions ws
     JOIN assignments a ON ws.assignment_id = a.id
     WHERE a.stage_id = $1 AND ws.end_time IS NOT NULL`,
    [id]
  );

  const actualDuration = parseFloat(sessionsResult.rows[0].total_minutes) || 0;

  // Calculate efficiency (planned/actual * 100)
  let efficiency = null;
  if (actualDuration > 0 && plannedDuration > 0) {
    efficiency = (plannedDuration / actualDuration) * 100;
  }

  const result = await query(
    `UPDATE stages
     SET tpz_minutes = $1, tj_minutes = $2, planned_duration_minutes = $3,
         actual_duration_minutes = $4, efficiency_percent = $5, updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [tpz, tj, plannedDuration, actualDuration, efficiency, id]
  );

  res.json({
    success: true,
    data: {
      stage: result.rows[0],
      calculations: {
        tpz_minutes: tpz,
        tj_minutes: tj,
        quantity,
        planned_duration_minutes: plannedDuration,
        actual_duration_minutes: actualDuration,
        efficiency_percent: efficiency,
      },
    },
  });
});

// POST /api/stages/:id/apply-standard - Apply standard times from template
export const applyStandardTimes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Get stage
  const stageResult = await query(
    `SELECT s.*, o.quantity FROM stages s
     JOIN orders o ON s.order_id = o.id
     WHERE s.id = $1`,
    [id]
  );

  if (stageResult.rows.length === 0) {
    throw new AppError('Stage not found', 404);
  }

  const stage = stageResult.rows[0];

  // Find matching standard
  const standardResult = await query(
    `SELECT * FROM stage_time_standards
     WHERE stage_name = $1 AND active = true
     ORDER BY machine_type NULLS LAST LIMIT 1`,
    [stage.stage_name]
  );

  if (standardResult.rows.length === 0) {
    throw new AppError(`Brak standardu czasowego dla etapu: ${stage.stage_name}`, 404);
  }

  const standard = standardResult.rows[0];
  const quantity = stage.quantity || 1;
  const tpz = parseFloat(standard.tpz_minutes) || 0;
  const tj = parseFloat(standard.tj_minutes) || 0;
  const complexityFactor = parseFloat(standard.complexity_factor) || 1.0;

  // Apply complexity factor
  const adjustedTpz = tpz * complexityFactor;
  const adjustedTj = tj * complexityFactor;
  const plannedDuration = calculateStagePlannedDuration(adjustedTpz, adjustedTj, quantity);

  const result = await query(
    `UPDATE stages
     SET tpz_minutes = $1, tj_minutes = $2, planned_duration_minutes = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [adjustedTpz, adjustedTj, plannedDuration, id]
  );

  logger.info(`Applied standard times to stage ${id}: TPZ=${adjustedTpz}, TJ=${adjustedTj}`);

  res.json({
    success: true,
    data: {
      stage: result.rows[0],
      applied_standard: standard,
    },
  });
});

// GET /api/stages/efficiency-report - Efficiency report across stages
export const getEfficiencyReport = asyncHandler(async (req: Request, res: Response) => {
  const { from_date, to_date, stage_name } = req.query;

  let sql = `
    SELECT
      s.stage_name,
      COUNT(*) as total_stages,
      AVG(s.efficiency_percent) as avg_efficiency,
      AVG(s.planned_duration_minutes) as avg_planned_minutes,
      AVG(s.actual_duration_minutes) as avg_actual_minutes,
      SUM(CASE WHEN s.efficiency_percent >= 100 THEN 1 ELSE 0 END) as on_target_count,
      SUM(CASE WHEN s.efficiency_percent < 100 THEN 1 ELSE 0 END) as below_target_count
    FROM stages s
    WHERE s.efficiency_percent IS NOT NULL
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (from_date) {
    sql += ` AND s.updated_at >= $${paramIndex}`;
    params.push(from_date);
    paramIndex++;
  }

  if (to_date) {
    sql += ` AND s.updated_at <= $${paramIndex}`;
    params.push(to_date);
    paramIndex++;
  }

  if (stage_name) {
    sql += ` AND s.stage_name = $${paramIndex}`;
    params.push(stage_name);
    paramIndex++;
  }

  sql += ' GROUP BY s.stage_name ORDER BY avg_efficiency DESC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { efficiency_report: result.rows },
  });
});
