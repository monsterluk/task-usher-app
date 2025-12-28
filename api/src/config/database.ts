import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'plexisystem',
  user: process.env.DB_USER || 'plexisystem',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error:', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
};
