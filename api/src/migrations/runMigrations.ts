import { query } from '../config/database';
import { logger } from '../utils/logger';

interface Migration {
  name: string;
  up: string;
}

const migrations: Migration[] = [
  {
    name: '000_create_machines_table',
    up: `
      CREATE TABLE IF NOT EXISTS machines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        cost_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
        description TEXT,
        department VARCHAR(50),
        status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
        active BOOLEAN DEFAULT true,
        specifications JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_machines_active ON machines(active);
      CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
      CREATE INDEX IF NOT EXISTS idx_machines_department ON machines(department);
    `,
  },
  {
    name: '001_create_audit_logs',
    up: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE')),
        old_values JSONB,
        new_values JSONB,
        changed_fields TEXT[],
        user_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        user_role VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `,
  },
  {
    name: '002_add_db_indexes',
    up: `
      -- Indexes for orders table
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);
      CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
      CREATE INDEX IF NOT EXISTS idx_orders_planned_date ON orders(planned_completion_date);
      CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

      -- Indexes for stages table
      CREATE INDEX IF NOT EXISTS idx_stages_order_id ON stages(order_id);
      CREATE INDEX IF NOT EXISTS idx_stages_status ON stages(status);

      -- Indexes for assignments table
      CREATE INDEX IF NOT EXISTS idx_assignments_stage_id ON assignments(stage_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_worker_id ON assignments(worker_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_completed ON assignments(completed);

      -- Indexes for work_sessions table
      CREATE INDEX IF NOT EXISTS idx_work_sessions_assignment_id ON work_sessions(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_work_sessions_start_time ON work_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_work_sessions_end_time ON work_sessions(end_time);

      -- Indexes for workers table
      CREATE INDEX IF NOT EXISTS idx_workers_email ON workers(email);
      CREATE INDEX IF NOT EXISTS idx_workers_pin ON workers(pin);
      CREATE INDEX IF NOT EXISTS idx_workers_role ON workers(role);
      CREATE INDEX IF NOT EXISTS idx_workers_active ON workers(active);

      -- Indexes for shipments table
      CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
      CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
    `,
  },
  {
    name: '003_create_quality_control',
    up: `
      -- Quality checkpoint templates (defines what to check)
      CREATE TABLE IF NOT EXISTS qc_checkpoints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        measurement_type VARCHAR(30) CHECK (measurement_type IN ('boolean', 'numeric', 'text', 'select')),
        min_value DECIMAL(10,3),
        max_value DECIMAL(10,3),
        unit VARCHAR(20),
        options JSONB,
        is_critical BOOLEAN DEFAULT false,
        sequence_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Quality checks performed on orders/stages
      CREATE TABLE IF NOT EXISTS quality_checks (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
        checkpoint_id INTEGER REFERENCES qc_checkpoints(id) ON DELETE SET NULL,
        inspector_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        check_type VARCHAR(30) CHECK (check_type IN ('incoming', 'in_process', 'final', 'random')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'conditional')),
        measured_value VARCHAR(255),
        is_within_tolerance BOOLEAN,
        notes TEXT,
        checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Defects/non-conformities found
      CREATE TABLE IF NOT EXISTS defects (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        quality_check_id INTEGER REFERENCES quality_checks(id) ON DELETE SET NULL,
        stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
        reported_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        defect_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('cosmetic', 'minor', 'major', 'critical')),
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted')),
        description TEXT NOT NULL,
        root_cause TEXT,
        corrective_action TEXT,
        quantity_affected INTEGER DEFAULT 1,
        cost_impact DECIMAL(10,2),
        photos JSONB,
        resolved_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_qc_checks_order_id ON quality_checks(order_id);
      CREATE INDEX IF NOT EXISTS idx_qc_checks_stage_id ON quality_checks(stage_id);
      CREATE INDEX IF NOT EXISTS idx_qc_checks_status ON quality_checks(status);
      CREATE INDEX IF NOT EXISTS idx_qc_checks_inspector ON quality_checks(inspector_id);
      CREATE INDEX IF NOT EXISTS idx_defects_order_id ON defects(order_id);
      CREATE INDEX IF NOT EXISTS idx_defects_status ON defects(status);
      CREATE INDEX IF NOT EXISTS idx_defects_severity ON defects(severity);
    `,
  },
  {
    name: '004_create_notifications',
    up: `
      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(30) CHECK (category IN ('order', 'quality', 'machine', 'maintenance', 'system', 'alert')),
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(255),
        reference_type VARCHAR(50),
        reference_id INTEGER,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Alert rules configuration
      CREATE TABLE IF NOT EXISTS alert_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL,
        conditions JSONB,
        actions JSONB,
        recipients JSONB,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Maintenance schedules
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id SERIAL PRIMARY KEY,
        machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
        maintenance_type VARCHAR(30) CHECK (maintenance_type IN ('preventive', 'corrective', 'predictive', 'inspection')),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        frequency_days INTEGER,
        last_performed_at TIMESTAMP WITH TIME ZONE,
        next_due_at TIMESTAMP WITH TIME ZONE,
        estimated_duration_hours DECIMAL(5,2),
        assigned_to INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
        checklist JSONB,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Maintenance logs
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
        machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
        performed_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        maintenance_type VARCHAR(30),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        duration_hours DECIMAL(5,2),
        parts_used JSONB,
        cost DECIMAL(10,2),
        findings TEXT,
        actions_taken TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_machine_id ON maintenance_schedules(machine_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due ON maintenance_schedules(next_due_at);
      CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_status ON maintenance_schedules(status);
      CREATE INDEX IF NOT EXISTS idx_maintenance_logs_machine_id ON maintenance_logs(machine_id);
    `,
  },
  {
    name: '005_create_documents',
    up: `
      -- Documents attached to orders
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100),
        file_size INTEGER,
        file_path VARCHAR(500) NOT NULL,
        category VARCHAR(50) CHECK (category IN ('drawing', 'specification', 'photo', 'contract', 'invoice', 'other')),
        description TEXT,
        version INTEGER DEFAULT 1,
        is_current BOOLEAN DEFAULT true,
        uploaded_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Document versions history
      CREATE TABLE IF NOT EXISTS document_versions (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        change_notes TEXT,
        uploaded_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id);
      CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
      CREATE INDEX IF NOT EXISTS idx_documents_is_current ON documents(is_current);
      CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
    `,
  },
];

// Create migrations tracking table
const createMigrationsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Check if migration has been applied
const isMigrationApplied = async (name: string): Promise<boolean> => {
  const result = await query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
  return result.rows.length > 0;
};

// Mark migration as applied
const markMigrationApplied = async (name: string) => {
  await query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
};

// Run all pending migrations
export const runMigrations = async () => {
  try {
    logger.info('Running database migrations...');

    await createMigrationsTable();

    for (const migration of migrations) {
      const applied = await isMigrationApplied(migration.name);

      if (!applied) {
        logger.info(`Applying migration: ${migration.name}`);
        await query(migration.up);
        await markMigrationApplied(migration.name);
        logger.info(`Migration ${migration.name} applied successfully`);
      }
    }

    logger.info('All migrations completed');
  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  }
};
