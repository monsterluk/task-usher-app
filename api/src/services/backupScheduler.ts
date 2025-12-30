import { query } from '../config/database';
import { logger } from '../utils/logger';
import { performScheduledBackup } from '../controllers/backupController';

let schedulerInterval: NodeJS.Timeout | null = null;
let lastBackupDate: string | null = null;

// Get backup settings from database
const getBackupSettings = async (): Promise<{
  enabled: boolean;
  hour: number;
  retentionDays: number;
  maxCount: number;
}> => {
  try {
    const result = await query('SELECT setting_key, setting_value FROM backup_settings');
    const settings: Record<string, string> = {};

    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value;
    }

    return {
      enabled: settings['auto_backup_enabled'] === 'true',
      hour: parseInt(settings['backup_hour'] || '3', 10),
      retentionDays: parseInt(settings['backup_retention_days'] || '30', 10),
      maxCount: parseInt(settings['max_backup_count'] || '30', 10),
    };
  } catch (error) {
    logger.error('Failed to get backup settings:', error);
    return {
      enabled: true,
      hour: 3,
      retentionDays: 30,
      maxCount: 30,
    };
  }
};

// Check if backup should run now
const shouldRunBackup = async (): Promise<boolean> => {
  const settings = await getBackupSettings();

  if (!settings.enabled) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().slice(0, 10);

  // Only run at the specified hour and if we haven't already run today
  if (currentHour === settings.hour && lastBackupDate !== currentDate) {
    return true;
  }

  return false;
};

// Run scheduled backup
const runScheduledBackup = async (): Promise<void> => {
  try {
    const shouldRun = await shouldRunBackup();

    if (shouldRun) {
      logger.info('Starting scheduled automatic backup...');
      lastBackupDate = new Date().toISOString().slice(0, 10);

      const result = await performScheduledBackup();

      if (result) {
        logger.info(`Automatic backup completed: ${result.filename}`);
      } else {
        logger.error('Automatic backup failed');
      }
    }
  } catch (error) {
    logger.error('Error in backup scheduler:', error);
  }
};

// Start the backup scheduler
export const startBackupScheduler = (): void => {
  if (schedulerInterval) {
    logger.warn('Backup scheduler already running');
    return;
  }

  // Check every hour if backup should run
  schedulerInterval = setInterval(runScheduledBackup, 60 * 60 * 1000); // 1 hour

  // Also run immediately on startup to check
  setTimeout(runScheduledBackup, 10000); // Wait 10 seconds for DB connection

  logger.info('Backup scheduler started - checking hourly for scheduled backups');
};

// Stop the backup scheduler
export const stopBackupScheduler = (): void => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Backup scheduler stopped');
  }
};

// Force run backup now (for testing)
export const forceBackup = async (): Promise<void> => {
  logger.info('Forcing immediate backup...');
  lastBackupDate = null; // Reset to allow backup
  await runScheduledBackup();
};

export default {
  start: startBackupScheduler,
  stop: stopBackupScheduler,
  force: forceBackup,
};
