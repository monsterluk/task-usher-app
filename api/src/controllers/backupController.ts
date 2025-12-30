import { Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const execAsync = promisify(exec);

// Backup configuration
const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/plexisystem';
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '30', 10);

interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  created_at: Date;
  type: 'full' | 'incremental';
}

// Helper: Get database connection info from environment
const getDbConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  database: process.env.DB_NAME || 'plexisystem',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Helper: Generate backup filename
const generateBackupFilename = (type: 'full' | 'incremental' = 'full'): string => {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `plexisystem_${type}_${dateStr}.sql.gz`;
};

// Helper: Ensure backup directory exists
const ensureBackupDir = async (): Promise<void> => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  } catch (error) {
    logger.error('Failed to create backup directory:', error);
    throw new AppError('Failed to create backup directory', 500);
  }
};

// Helper: Clean old backups (keep only MAX_BACKUPS)
const cleanOldBackups = async (): Promise<number> => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql.gz'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    let deleted = 0;
    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        deleted++;
        logger.info(`Deleted old backup: ${file.name}`);
      }
    }
    return deleted;
  } catch (error) {
    logger.error('Failed to clean old backups:', error);
    return 0;
  }
};

// Helper: Get backup file info
const getBackupInfo = (filename: string): BackupInfo | null => {
  try {
    const filepath = path.join(BACKUP_DIR, filename);
    const stats = fs.statSync(filepath);
    const type = filename.includes('_full_') ? 'full' : 'incremental';
    return {
      filename,
      path: filepath,
      size: stats.size,
      created_at: stats.mtime,
      type,
    };
  } catch (error) {
    return null;
  }
};

// POST /api/admin/backup - Create manual backup
export const createBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type = 'full' } = req.body;
  const dbConfig = getDbConfig();

  await ensureBackupDir();

  const filename = generateBackupFilename(type);
  const filepath = path.join(BACKUP_DIR, filename);

  logger.info(`Starting database backup: ${filename}`);

  try {
    // Create backup using pg_dump
    const pgDumpCmd = `PGPASSWORD='${dbConfig.password}' pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -Fc | gzip > ${filepath}`;

    const { stdout, stderr } = await execAsync(pgDumpCmd, { timeout: 300000 }); // 5 min timeout

    if (stderr && !stderr.includes('Warning')) {
      logger.warn('pg_dump stderr:', stderr);
    }

    // Get backup info
    const backupInfo = getBackupInfo(filename);
    if (!backupInfo) {
      throw new AppError('Backup file was not created', 500);
    }

    // Log backup to database
    await query(
      `INSERT INTO backup_logs (filename, filepath, file_size, backup_type, status, created_by)
       VALUES ($1, $2, $3, $4, 'completed', $5)`,
      [filename, filepath, backupInfo.size, type, req.user?.id]
    );

    // Clean old backups
    const deletedCount = await cleanOldBackups();

    logger.info(`Backup completed: ${filename} (${(backupInfo.size / 1024 / 1024).toFixed(2)} MB)`);

    res.json({
      success: true,
      data: {
        backup: {
          filename: backupInfo.filename,
          size: backupInfo.size,
          size_mb: (backupInfo.size / 1024 / 1024).toFixed(2),
          created_at: backupInfo.created_at,
          type: backupInfo.type,
        },
        old_backups_deleted: deletedCount,
      },
    });
  } catch (error) {
    logger.error('Backup failed:', error);

    // Log failed backup
    await query(
      `INSERT INTO backup_logs (filename, filepath, backup_type, status, error_message, created_by)
       VALUES ($1, $2, $3, 'failed', $4, $5)`,
      [filename, filepath, type, (error as Error).message, req.user?.id]
    );

    throw new AppError(`Backup failed: ${(error as Error).message}`, 500);
  }
});

// GET /api/admin/backups - List backups
export const listBackups = asyncHandler(async (req: AuthRequest, res: Response) => {
  await ensureBackupDir();

  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql.gz'))
      .map(f => getBackupInfo(f))
      .filter((info): info is BackupInfo => info !== null)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    // Get backup logs from database
    const logsResult = await query(
      `SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 50`
    );

    res.json({
      success: true,
      data: {
        backups: files.map(f => ({
          filename: f.filename,
          size: f.size,
          size_mb: (f.size / 1024 / 1024).toFixed(2),
          created_at: f.created_at,
          type: f.type,
        })),
        total: files.length,
        max_backups: MAX_BACKUPS,
        backup_dir: BACKUP_DIR,
        recent_logs: logsResult.rows,
      },
    });
  } catch (error) {
    logger.error('Failed to list backups:', error);
    throw new AppError('Failed to list backups', 500);
  }
});

// DELETE /api/admin/backups/:filename - Delete specific backup
export const deleteBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filename } = req.params;

  // Validate filename (security check)
  if (!filename.match(/^plexisystem_(full|incremental)_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.sql\.gz$/)) {
    throw new AppError('Invalid backup filename', 400);
  }

  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new AppError('Backup not found', 404);
  }

  try {
    fs.unlinkSync(filepath);

    // Log deletion
    await query(
      `INSERT INTO backup_logs (filename, filepath, backup_type, status, created_by)
       VALUES ($1, $2, 'delete', 'completed', $3)`,
      [filename, filepath, req.user?.id]
    );

    logger.info(`Backup deleted: ${filename}`);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete backup:', error);
    throw new AppError('Failed to delete backup', 500);
  }
});

// POST /api/admin/restore - Restore from backup
export const restoreBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filename } = req.body;
  const dbConfig = getDbConfig();

  if (!filename) {
    throw new AppError('Backup filename is required', 400);
  }

  // Validate filename (security check)
  if (!filename.match(/^plexisystem_(full|incremental)_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.sql\.gz$/)) {
    throw new AppError('Invalid backup filename', 400);
  }

  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new AppError('Backup file not found', 404);
  }

  logger.warn(`Starting database restore from: ${filename}`);

  try {
    // First create a pre-restore backup
    const preRestoreFilename = generateBackupFilename('full').replace('.sql.gz', '_pre_restore.sql.gz');
    const preRestorePath = path.join(BACKUP_DIR, preRestoreFilename);

    const backupCmd = `PGPASSWORD='${dbConfig.password}' pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -Fc | gzip > ${preRestorePath}`;
    await execAsync(backupCmd, { timeout: 300000 });

    logger.info(`Pre-restore backup created: ${preRestoreFilename}`);

    // Restore from backup
    const restoreCmd = `gunzip -c ${filepath} | PGPASSWORD='${dbConfig.password}' pg_restore -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --clean --if-exists`;

    await execAsync(restoreCmd, { timeout: 600000 }); // 10 min timeout

    // Log restore
    await query(
      `INSERT INTO backup_logs (filename, filepath, backup_type, status, created_by)
       VALUES ($1, $2, 'restore', 'completed', $3)`,
      [filename, filepath, req.user?.id]
    );

    logger.info(`Database restored from: ${filename}`);

    res.json({
      success: true,
      message: 'Database restored successfully',
      data: {
        restored_from: filename,
        pre_restore_backup: preRestoreFilename,
      },
    });
  } catch (error) {
    logger.error('Restore failed:', error);

    // Log failed restore
    await query(
      `INSERT INTO backup_logs (filename, filepath, backup_type, status, error_message, created_by)
       VALUES ($1, $2, 'restore', 'failed', $3, $4)`,
      [filename, filepath, (error as Error).message, req.user?.id]
    );

    throw new AppError(`Restore failed: ${(error as Error).message}`, 500);
  }
});

// GET /api/admin/backup/status - Get backup system status
export const getBackupStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  await ensureBackupDir();

  // Get last backup info
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql.gz'))
    .map(f => getBackupInfo(f))
    .filter((info): info is BackupInfo => info !== null)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  const lastBackup = files[0] || null;

  // Calculate total backup size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Get database size
  const dbSizeResult = await query(
    `SELECT pg_database_size(current_database()) as size`
  );
  const dbSize = dbSizeResult.rows[0]?.size || 0;

  // Get recent backup logs
  const logsResult = await query(
    `SELECT * FROM backup_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5`
  );

  // Calculate hours since last backup
  const hoursSinceLastBackup = lastBackup
    ? (Date.now() - lastBackup.created_at.getTime()) / (1000 * 60 * 60)
    : null;

  res.json({
    success: true,
    data: {
      status: hoursSinceLastBackup === null ? 'no_backups'
        : hoursSinceLastBackup > 48 ? 'warning'
        : 'healthy',
      last_backup: lastBackup ? {
        filename: lastBackup.filename,
        created_at: lastBackup.created_at,
        size_mb: (lastBackup.size / 1024 / 1024).toFixed(2),
        hours_ago: Math.round(hoursSinceLastBackup || 0),
      } : null,
      backup_count: files.length,
      total_backup_size_mb: (totalSize / 1024 / 1024).toFixed(2),
      database_size_mb: (dbSize / 1024 / 1024).toFixed(2),
      max_backups: MAX_BACKUPS,
      backup_directory: BACKUP_DIR,
      recent_failures: logsResult.rows,
    },
  });
});

// Exported for cron job
export const performScheduledBackup = async (): Promise<BackupInfo | null> => {
  const dbConfig = getDbConfig();

  await ensureBackupDir();

  const filename = generateBackupFilename('full');
  const filepath = path.join(BACKUP_DIR, filename);

  logger.info(`Starting scheduled backup: ${filename}`);

  try {
    const pgDumpCmd = `PGPASSWORD='${dbConfig.password}' pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -Fc | gzip > ${filepath}`;

    await execAsync(pgDumpCmd, { timeout: 300000 });

    const backupInfo = getBackupInfo(filename);
    if (!backupInfo) {
      throw new Error('Backup file was not created');
    }

    // Log backup to database
    await query(
      `INSERT INTO backup_logs (filename, filepath, file_size, backup_type, status)
       VALUES ($1, $2, $3, 'full', 'completed')`,
      [filename, filepath, backupInfo.size]
    );

    // Clean old backups
    await cleanOldBackups();

    logger.info(`Scheduled backup completed: ${filename} (${(backupInfo.size / 1024 / 1024).toFixed(2)} MB)`);

    return backupInfo;
  } catch (error) {
    logger.error('Scheduled backup failed:', error);

    await query(
      `INSERT INTO backup_logs (filename, filepath, backup_type, status, error_message)
       VALUES ($1, $2, 'full', 'failed', $3)`,
      [filename, filepath, (error as Error).message]
    );

    return null;
  }
};
