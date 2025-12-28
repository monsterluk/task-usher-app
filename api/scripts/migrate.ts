import { pool, query } from '../src/config/database';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const createTables = async () => {
  const sql = `
    -- Drop existing tables (for fresh start)
    DROP TABLE IF EXISTS shipments CASCADE;
    DROP TABLE IF EXISTS work_sessions CASCADE;
    DROP TABLE IF EXISTS assignments CASCADE;
    DROP TABLE IF EXISTS stages CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS workers CASCADE;

    -- Workers (Pracownicy)
    CREATE TABLE workers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      hourly_rate DECIMAL(10,2) NOT NULL,
      position VARCHAR(100) NOT NULL,
      role VARCHAR(50) DEFAULT 'WORKER',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Orders (Zlecenia)
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      client_order_number VARCHAR(100),
      client_name VARCHAR(255) NOT NULL,
      client_email VARCHAR(255),
      client_phone VARCHAR(20),
      product_name VARCHAR(255) NOT NULL,
      quantity INT,
      price_total DECIMAL(10,2),
      price_per_unit DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'NOWE',
      planned_completion_date DATE,
      notes TEXT,
      folder_path VARCHAR(500),
      invoice_number VARCHAR(100),
      invoice_date DATE,
      created_by VARCHAR(255),
      archived BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      closed_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Stages (Etapy produkcji)
    CREATE TABLE stages (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      stage_number INT NOT NULL,
      stage_name VARCHAR(255) NOT NULL,
      is_required BOOLEAN DEFAULT true,
      status VARCHAR(50) DEFAULT 'NOWY',
      sequence_order INT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Assignments (Przydzielenia stage -> workers)
    CREATE TABLE assignments (
      id SERIAL PRIMARY KEY,
      stage_id INT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
      worker_id INT NOT NULL REFERENCES workers(id),
      status VARCHAR(50) DEFAULT 'NOWY',
      assigned_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Work Sessions (Sesje pracy - time tracking)
    CREATE TABLE work_sessions (
      id SERIAL PRIMARY KEY,
      assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      duration_minutes DECIMAL(10,2),
      cost DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Shipments (Przesyłki - Apaczka)
    CREATE TABLE shipments (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      shipment_number VARCHAR(100) UNIQUE,
      status VARCHAR(50) DEFAULT 'OCZEKUJE',
      tracking_url VARCHAR(500),
      weight DECIMAL(10,2),
      dimensions VARCHAR(50),
      package_type VARCHAR(50),
      service VARCHAR(50),
      recipient_address VARCHAR(500),
      recipient_email VARCHAR(255),
      recipient_phone VARCHAR(20),
      apaczka_response JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_orders_status ON orders(status);
    CREATE INDEX idx_orders_archived ON orders(archived);
    CREATE INDEX idx_orders_created_at ON orders(created_at);
    CREATE INDEX idx_stages_order_id ON stages(order_id);
    CREATE INDEX idx_stages_status ON stages(status);
    CREATE INDEX idx_assignments_stage_id ON assignments(stage_id);
    CREATE INDEX idx_assignments_worker_id ON assignments(worker_id);
    CREATE INDEX idx_assignments_status ON assignments(status);
    CREATE INDEX idx_work_sessions_assignment_id ON work_sessions(assignment_id);
    CREATE INDEX idx_work_sessions_start_time ON work_sessions(start_time);
    CREATE INDEX idx_shipments_order_id ON shipments(order_id);
    CREATE INDEX idx_workers_email ON workers(email);
    CREATE INDEX idx_workers_active ON workers(active);
  `;

  try {
    await query(sql);
    logger.info('✅ Database tables created successfully');
  } catch (error) {
    logger.error('❌ Error creating tables:', error);
    throw error;
  }
};

const runMigration = async () => {
  logger.info('Starting database migration...');

  try {
    await createTables();
    logger.info('✅ Migration completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigration();
