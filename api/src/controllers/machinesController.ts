import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logAudit, getAuditContextFromRequest } from '../services/auditService';

// GET /api/machines
export const getAllMachines = asyncHandler(async (req: Request, res: Response) => {
  const { active, status, department } = req.query;

  let sql = 'SELECT * FROM machines WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (active !== undefined) {
    sql += ` AND active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  if (status) {
    sql += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (department) {
    sql += ` AND department = $${paramIndex}`;
    params.push(department);
    paramIndex++;
  }

  sql += ' ORDER BY name ASC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      machines: result.rows,
    },
  });
});

// GET /api/machines/:id
export const getMachineById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query('SELECT * FROM machines WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new AppError('Maszyna nie znaleziona', 404);
  }

  res.json({
    success: true,
    data: {
      machine: result.rows[0],
    },
  });
});

// POST /api/machines
export const createMachine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, cost_per_hour, description, department, status, active, specifications } = req.body;

  if (!name) {
    throw new AppError('Nazwa maszyny jest wymagana', 400);
  }

  const result = await query(
    `INSERT INTO machines (name, cost_per_hour, description, department, status, active, specifications)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      name,
      cost_per_hour || 0,
      description || null,
      department || null,
      status || 'available',
      active !== false,
      specifications ? JSON.stringify(specifications) : null,
    ]
  );

  const machine = result.rows[0];

  logger.info(`Machine created: ${machine.name}`);

  // Audit log
  await logAudit({
    tableName: 'machines',
    recordId: machine.id,
    action: 'CREATE',
    newValues: machine,
    context: getAuditContextFromRequest(req),
  });

  res.status(201).json({
    success: true,
    data: {
      machine,
    },
  });
});

// PUT /api/machines/:id
export const updateMachine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, cost_per_hour, description, department, status, active, specifications } = req.body;

  // Check if machine exists
  const existingResult = await query('SELECT * FROM machines WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Maszyna nie znaleziona', 404);
  }

  // Build update query
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fields: Record<string, any> = {
    name,
    cost_per_hour,
    description,
    department,
    status,
    active,
    specifications: specifications ? JSON.stringify(specifications) : undefined,
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

  const sql = `
    UPDATE machines
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(sql, params);

  logger.info(`Machine updated: ${result.rows[0].name}`);

  // Audit log
  await logAudit({
    tableName: 'machines',
    recordId: Number(id),
    action: 'UPDATE',
    oldValues: existingResult.rows[0],
    newValues: result.rows[0],
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: {
      machine: result.rows[0],
    },
  });
});

// DELETE /api/machines/:id
export const deleteMachine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check if machine exists
  const existingResult = await query('SELECT * FROM machines WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Maszyna nie znaleziona', 404);
  }

  // Audit log before delete
  await logAudit({
    tableName: 'machines',
    recordId: Number(id),
    action: 'DELETE',
    oldValues: existingResult.rows[0],
    context: getAuditContextFromRequest(req),
  });

  await query('DELETE FROM machines WHERE id = $1', [id]);

  logger.info(`Machine deleted: ${existingResult.rows[0].name}`);

  res.json({
    success: true,
    message: 'Maszyna usunięta',
  });
});

// PUT /api/machines/:id/status
export const updateMachineStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['available', 'in_use', 'maintenance', 'offline'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Nieprawidłowy status. Dozwolone: ${validStatuses.join(', ')}`, 400);
  }

  const result = await query(
    `UPDATE machines SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Maszyna nie znaleziona', 404);
  }

  logger.info(`Machine status updated: ${result.rows[0].name} -> ${status}`);

  // Audit log
  await logAudit({
    tableName: 'machines',
    recordId: Number(id),
    action: 'UPDATE',
    newValues: { status },
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: {
      machine: result.rows[0],
    },
  });
});
