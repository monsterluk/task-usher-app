import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { AuthRequest, Worker } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// GET /api/workers
export const getAllWorkers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { active, position, role } = req.query;
  const user = req.user;

  // Only ADMIN can see hourly_rate
  const isAdmin = user?.role === 'ADMIN';
  const columns = isAdmin
    ? 'id, name, email, pin, position, role, hourly_rate, skills, active, created_at, updated_at'
    : 'id, name, email, position, role, skills, active, created_at, updated_at';

  let sql = `
    SELECT ${columns}
    FROM workers
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (active !== undefined) {
    sql += ` AND active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  if (position) {
    sql += ` AND position = $${paramIndex}`;
    params.push(position);
    paramIndex++;
  }

  if (role) {
    sql += ` AND role = $${paramIndex}`;
    params.push(role);
    paramIndex++;
  }

  sql += ' ORDER BY name ASC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      workers: result.rows,
    },
  });
});

// GET /api/workers/:id
export const getWorkerById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only ADMIN can see hourly_rate
  const isAdmin = user?.role === 'ADMIN';
  const columns = isAdmin
    ? 'id, name, email, pin, position, role, hourly_rate, skills, active, created_at, updated_at'
    : 'id, name, email, position, role, skills, active, created_at, updated_at';

  const result = await query(
    `SELECT ${columns} FROM workers WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Worker not found', 404);
  }

  res.json({
    success: true,
    data: {
      worker: result.rows[0],
    },
  });
});

// POST /api/workers
export const createWorker = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, pin, position, role, hourly_rate, skills } = req.body;

  if (!name || !email || !position) {
    throw new AppError('Name, email, and position are required', 400);
  }

  // Check if email already exists
  const existingWorker = await query('SELECT id FROM workers WHERE email = $1', [
    email.toLowerCase(),
  ]);

  if (existingWorker.rows.length > 0) {
    throw new AppError('Worker with this email already exists', 400);
  }

  // Check if PIN already exists (if provided)
  if (pin) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new AppError('PIN must be 4-6 digits', 400);
    }
    const existingPin = await query('SELECT id FROM workers WHERE pin = $1', [pin]);
    if (existingPin.rows.length > 0) {
      throw new AppError('This PIN is already in use', 400);
    }
  }

  // Hash password if provided
  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, 10);
  }

  const result = await query(
    `INSERT INTO workers (name, email, password_hash, pin, position, role, hourly_rate, skills, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING id, name, email, pin, position, role, hourly_rate, skills, active, created_at, updated_at`,
    [name, email.toLowerCase(), passwordHash, pin || null, position, role || 'PRACOWNIK', hourly_rate || 43.27, skills || []]
  );

  logger.info(`Worker created: ${email}`);

  res.status(201).json({
    success: true,
    data: {
      worker: result.rows[0],
    },
  });
});

// PUT /api/workers/:id
export const updateWorker = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, pin, position, role, hourly_rate, skills, active, password } = req.body;

  // Check if worker exists
  const existingResult = await query('SELECT * FROM workers WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Worker not found', 404);
  }

  const existingWorker = existingResult.rows[0];

  // If email is being changed, check for duplicates
  if (email && email.toLowerCase() !== existingWorker.email) {
    const duplicateCheck = await query(
      'SELECT id FROM workers WHERE email = $1 AND id != $2',
      [email.toLowerCase(), id]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new AppError('Email already in use', 400);
    }
  }

  // If PIN is being changed, validate and check for duplicates
  if (pin !== undefined && pin !== existingWorker.pin) {
    if (pin && !/^\d{4,6}$/.test(pin)) {
      throw new AppError('PIN must be 4-6 digits', 400);
    }
    if (pin) {
      const duplicatePinCheck = await query(
        'SELECT id FROM workers WHERE pin = $1 AND id != $2',
        [pin, id]
      );
      if (duplicatePinCheck.rows.length > 0) {
        throw new AppError('This PIN is already in use', 400);
      }
    }
  }

  // Prepare update fields
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }

  if (email !== undefined) {
    updates.push(`email = $${paramIndex}`);
    params.push(email.toLowerCase());
    paramIndex++;
  }

  if (pin !== undefined) {
    updates.push(`pin = $${paramIndex}`);
    params.push(pin || null);
    paramIndex++;
  }

  if (position !== undefined) {
    updates.push(`position = $${paramIndex}`);
    params.push(position);
    paramIndex++;
  }

  if (role !== undefined) {
    updates.push(`role = $${paramIndex}`);
    params.push(role);
    paramIndex++;
  }

  if (hourly_rate !== undefined) {
    updates.push(`hourly_rate = $${paramIndex}`);
    params.push(hourly_rate);
    paramIndex++;
  }

  if (skills !== undefined) {
    updates.push(`skills = $${paramIndex}`);
    params.push(skills);
    paramIndex++;
  }

  if (active !== undefined) {
    updates.push(`active = $${paramIndex}`);
    params.push(active);
    paramIndex++;
  }

  if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    updates.push(`password_hash = $${paramIndex}`);
    params.push(passwordHash);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `
    UPDATE workers
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, email, pin, position, role, hourly_rate, skills, active, created_at, updated_at
  `;

  const result = await query(sql, params);

  logger.info(`Worker updated: ${result.rows[0].email}`);

  res.json({
    success: true,
    data: {
      worker: result.rows[0],
    },
  });
});

// DELETE /api/workers/:id
export const deleteWorker = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check if worker exists
  const existingResult = await query('SELECT email FROM workers WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Worker not found', 404);
  }

  // Check if worker has any assignments
  const assignmentsResult = await query(
    'SELECT COUNT(*) FROM assignments WHERE worker_id = $1',
    [id]
  );

  if (parseInt(assignmentsResult.rows[0].count) > 0) {
    // Soft delete - set active to false
    await query('UPDATE workers SET active = false, updated_at = NOW() WHERE id = $1', [
      id,
    ]);

    logger.info(`Worker deactivated (has assignments): ${existingResult.rows[0].email}`);

    return res.json({
      success: true,
      message: 'Worker deactivated (has existing assignments)',
    });
  }

  // Hard delete if no assignments
  await query('DELETE FROM workers WHERE id = $1', [id]);

  logger.info(`Worker deleted: ${existingResult.rows[0].email}`);

  res.json({
    success: true,
    message: 'Worker deleted successfully',
  });
});

// GET /api/workers/:id/assignments
export const getWorkerAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.query;

  let sql = `
    SELECT
      a.id,
      a.stage_id,
      a.worker_id,
      a.status,
      a.assigned_at,
      a.completed_at,
      s.stage_name,
      s.stage_number,
      o.id as order_id,
      o.order_number,
      o.client_name,
      o.product_name
    FROM assignments a
    JOIN stages s ON a.stage_id = s.id
    JOIN orders o ON s.order_id = o.id
    WHERE a.worker_id = $1
  `;
  const params: any[] = [id];

  if (status) {
    sql += ' AND a.status = $2';
    params.push(status);
  }

  sql += ' ORDER BY a.assigned_at DESC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      assignments: result.rows,
    },
  });
});
