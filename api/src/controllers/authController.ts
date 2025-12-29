import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { generateToken } from '../middleware/auth';
import { AuthRequest, Worker, JwtPayload } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// POST /api/auth/login (email + password)
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  // Find user by email
  const result = await query(
    'SELECT * FROM workers WHERE email = $1 AND active = true',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid credentials', 401);
  }

  const worker: Worker = result.rows[0];

  // Check password (if password_hash exists)
  if (worker.password_hash) {
    const isValidPassword = await bcrypt.compare(password, worker.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }
  } else {
    // For demo/development: accept any password if no hash is set
    logger.warn(`User ${email} logged in without password hash (demo mode)`);
  }

  // Generate JWT token
  const payload: JwtPayload = {
    id: worker.id,
    email: worker.email,
    role: worker.role,
  };

  const token = generateToken(payload);

  logger.info(`User logged in: ${worker.email}`);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        role: worker.role,
        position: worker.position,
        skills: worker.skills || [],
      },
    },
  });
});

// POST /api/auth/pin - Logowanie PIN-em
export const loginWithPin = asyncHandler(async (req: Request, res: Response) => {
  const { pin } = req.body;

  if (!pin) {
    throw new AppError('PIN is required', 400);
  }

  // Walidacja formatu PIN (4-6 cyfr)
  if (!/^\d{4,6}$/.test(pin)) {
    throw new AppError('PIN must be 4-6 digits', 400);
  }

  // Find user by PIN
  const result = await query(
    'SELECT * FROM workers WHERE pin = $1 AND active = true',
    [pin]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid PIN', 401);
  }

  const worker: Worker = result.rows[0];

  // Generate JWT token
  const payload: JwtPayload = {
    id: worker.id,
    email: worker.email,
    role: worker.role,
  };

  const token = generateToken(payload);

  logger.info(`User logged in with PIN: ${worker.name} (${worker.role})`);

  // Filtruj dane w zależności od roli
  // PRACOWNIK nie widzi hourly_rate ani innych wrażliwych danych
  const userData: any = {
    id: worker.id,
    name: worker.name,
    email: worker.email,
    role: worker.role,
    position: worker.position,
    skills: worker.skills || [],
  };

  // Tylko non-PRACOWNIK widzi stawkę godzinową
  if (worker.role !== 'PRACOWNIK') {
    userData.hourly_rate = worker.hourly_rate;
  }

  res.json({
    success: true,
    data: {
      token,
      user: userData,
    },
  });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  // JWT tokens are stateless, so we just acknowledge the logout
  // In production, you might want to maintain a token blacklist
  logger.info(`User logged out: ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me
export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const result = await query(
    'SELECT id, name, email, position, role, hourly_rate, skills, active, created_at FROM workers WHERE id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const worker = result.rows[0];

  // Filtruj dane w zależności od roli
  const userData: any = {
    id: worker.id,
    name: worker.name,
    email: worker.email,
    role: worker.role,
    position: worker.position,
    skills: worker.skills || [],
    active: worker.active,
    created_at: worker.created_at,
  };

  // Tylko non-PRACOWNIK widzi stawkę godzinową
  if (worker.role !== 'PRACOWNIK') {
    userData.hourly_rate = worker.hourly_rate;
  }

  res.json({
    success: true,
    data: {
      user: userData,
    },
  });
});

// POST /api/auth/register (Admin/Kierownik only - create new user)
export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, pin, password, position, role, hourly_rate, skills } = req.body;

  if (!name || !email || !position || !hourly_rate) {
    throw new AppError('Name, email, position, and hourly_rate are required', 400);
  }

  // Walidacja PIN jeśli podany
  if (pin && !/^\d{4,6}$/.test(pin)) {
    throw new AppError('PIN must be 4-6 digits', 400);
  }

  // Check if email already exists
  const existingUser = await query('SELECT id FROM workers WHERE email = $1', [
    email.toLowerCase(),
  ]);

  if (existingUser.rows.length > 0) {
    throw new AppError('Email already registered', 400);
  }

  // Check if PIN already exists (if provided)
  if (pin) {
    const existingPin = await query('SELECT id FROM workers WHERE pin = $1', [pin]);
    if (existingPin.rows.length > 0) {
      throw new AppError('PIN already in use', 400);
    }
  }

  // Hash password if provided
  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, 10);
  }

  // Insert new worker
  const result = await query(
    `INSERT INTO workers (name, email, pin, password_hash, position, role, hourly_rate, skills, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING id, name, email, pin, position, role, hourly_rate, skills, active, created_at`,
    [
      name,
      email.toLowerCase(),
      pin || null,
      passwordHash,
      position,
      role || 'PRACOWNIK',
      hourly_rate,
      skills || [],
    ]
  );

  const newWorker = result.rows[0];

  logger.info(`New user registered: ${email} (PIN: ${pin || 'none'}, Role: ${role || 'PRACOWNIK'})`);

  res.status(201).json({
    success: true,
    data: {
      worker: newWorker,
    },
  });
});

// PUT /api/auth/change-password
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { currentPassword, newPassword } = req.body;

  if (!newPassword) {
    throw new AppError('New password is required', 400);
  }

  // Get current user with password hash
  const result = await query('SELECT * FROM workers WHERE id = $1', [req.user.id]);

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const worker = result.rows[0];

  // Verify current password if it exists
  if (worker.password_hash && currentPassword) {
    const isValidPassword = await bcrypt.compare(currentPassword, worker.password_hash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await query('UPDATE workers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    newPasswordHash,
    req.user.id,
  ]);

  logger.info(`Password changed for user: ${worker.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});
