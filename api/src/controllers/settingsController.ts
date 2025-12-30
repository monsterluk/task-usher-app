import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// Interface for system settings
interface SystemSettings {
  company_name: string;
  company_nip: string;
  default_worker_rate: number;
  default_machine_rate: number;
  company_address?: string;
  company_email?: string;
  company_phone?: string;
}

// GET /api/settings
export const getSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Check if settings table exists and has data
  const result = await query(`
    SELECT * FROM system_settings WHERE id = 1
  `);

  if (result.rows.length === 0) {
    // Return default settings if none exist
    res.json({
      success: true,
      data: {
        company_name: 'PLEXI SYSTEM',
        company_nip: '',
        default_worker_rate: 43.27,
        default_machine_rate: 100.00,
        company_address: '',
        company_email: '',
        company_phone: '',
      },
    });
    return;
  }

  const settings = result.rows[0];

  res.json({
    success: true,
    data: {
      company_name: settings.company_name,
      company_nip: settings.company_nip,
      default_worker_rate: Number(settings.default_worker_rate),
      default_machine_rate: Number(settings.default_machine_rate),
      company_address: settings.company_address,
      company_email: settings.company_email,
      company_phone: settings.company_phone,
    },
  });
});

// PUT /api/settings
export const updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Only ADMIN can update settings
  if (req.user?.role !== 'ADMIN') {
    throw new AppError('Only administrators can modify settings', 403);
  }

  const {
    company_name,
    company_nip,
    default_worker_rate,
    default_machine_rate,
    company_address,
    company_email,
    company_phone,
  } = req.body;

  // Check if settings record exists
  const existingResult = await query('SELECT id FROM system_settings WHERE id = 1');

  let result;
  if (existingResult.rows.length === 0) {
    // Insert new settings
    result = await query(`
      INSERT INTO system_settings (id, company_name, company_nip, default_worker_rate, default_machine_rate, company_address, company_email, company_phone, updated_at)
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [
      company_name || 'PLEXI SYSTEM',
      company_nip || '',
      default_worker_rate || 43.27,
      default_machine_rate || 100.00,
      company_address || '',
      company_email || '',
      company_phone || '',
    ]);
  } else {
    // Update existing settings
    result = await query(`
      UPDATE system_settings
      SET
        company_name = COALESCE($1, company_name),
        company_nip = COALESCE($2, company_nip),
        default_worker_rate = COALESCE($3, default_worker_rate),
        default_machine_rate = COALESCE($4, default_machine_rate),
        company_address = COALESCE($5, company_address),
        company_email = COALESCE($6, company_email),
        company_phone = COALESCE($7, company_phone),
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [
      company_name,
      company_nip,
      default_worker_rate,
      default_machine_rate,
      company_address,
      company_email,
      company_phone,
    ]);
  }

  const settings = result.rows[0];

  logger.info(`System settings updated by ${req.user?.email}`);

  res.json({
    success: true,
    data: {
      company_name: settings.company_name,
      company_nip: settings.company_nip,
      default_worker_rate: Number(settings.default_worker_rate),
      default_machine_rate: Number(settings.default_machine_rate),
      company_address: settings.company_address,
      company_email: settings.company_email,
      company_phone: settings.company_phone,
    },
    message: 'Settings updated successfully',
  });
});

// POST /api/settings/init - Initialize settings table (run once)
export const initSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Check if ADMIN
  if (req.user?.role !== 'ADMIN') {
    throw new AppError('Only administrators can initialize settings', 403);
  }

  // Create table if it doesn't exist
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      company_name VARCHAR(255) DEFAULT 'PLEXI SYSTEM',
      company_nip VARCHAR(20) DEFAULT '',
      default_worker_rate DECIMAL(10,2) DEFAULT 43.27,
      default_machine_rate DECIMAL(10,2) DEFAULT 100.00,
      company_address TEXT DEFAULT '',
      company_email VARCHAR(255) DEFAULT '',
      company_phone VARCHAR(50) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT single_settings CHECK (id = 1)
    )
  `);

  // Insert default settings if not exists
  await query(`
    INSERT INTO system_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);

  logger.info(`System settings initialized by ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Settings table initialized',
  });
});
