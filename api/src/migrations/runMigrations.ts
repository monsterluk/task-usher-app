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
      -- Note: completed column may not exist, skip this index

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
  {
    name: '006_create_calendar_events',
    up: `
      -- Custom calendar events (meetings, reminders, etc.)
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE,
        all_day BOOLEAN DEFAULT false,
        event_type VARCHAR(30) CHECK (event_type IN ('order', 'maintenance', 'meeting', 'deadline', 'reminder', 'other')),
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        recurrence_rule VARCHAR(255),
        color VARCHAR(20),
        location VARCHAR(255),
        attendees JSONB,
        reminders JSONB,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        google_event_id VARCHAR(255),
        synced_with_google BOOLEAN DEFAULT false,
        last_synced_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Google Calendar sync tokens
      CREATE TABLE IF NOT EXISTS google_calendar_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        token_type VARCHAR(50),
        expires_at TIMESTAMP WITH TIME ZONE,
        calendar_id VARCHAR(255),
        sync_enabled BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_order_id ON calendar_events(order_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
      CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON google_calendar_tokens(user_id);
    `,
  },
  {
    name: '007_create_notification_settings',
    up: `
      -- User notification preferences
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        email_enabled BOOLEAN DEFAULT true,
        push_enabled BOOLEAN DEFAULT false,
        order_updates BOOLEAN DEFAULT true,
        deadline_reminders BOOLEAN DEFAULT true,
        daily_summary BOOLEAN DEFAULT false,
        reminder_hours_before INTEGER DEFAULT 24,
        email VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );

      -- Push notification subscriptions
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        subscription JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, subscription)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
    `,
  },
  {
    name: '008_create_announcements',
    up: `
      -- Announcements board
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'urgent')),
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
        pinned BOOLEAN DEFAULT false,
        active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active);
      CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(pinned);
      CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
    `,
  },
  {
    name: '009_create_material_prices',
    up: `
      -- Material prices for cost calculator
      CREATE TABLE IF NOT EXISTS material_prices (
        id SERIAL PRIMARY KEY,
        material_type VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        price_per_unit DECIMAL(10,2) NOT NULL,
        supplier VARCHAR(100),
        min_order_quantity DECIMAL(10,2),
        lead_time_days INTEGER,
        notes TEXT,
        active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Production overheads and margins
      CREATE TABLE IF NOT EXISTS production_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value DECIMAL(10,4),
        setting_type VARCHAR(30) CHECK (setting_type IN ('percentage', 'fixed', 'multiplier')),
        description TEXT,
        updated_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Insert default production settings
      INSERT INTO production_settings (setting_key, setting_value, setting_type, description) VALUES
        ('material_margin', 15.00, 'percentage', 'Narzut na materialy (%)'),
        ('labor_margin', 25.00, 'percentage', 'Narzut na robocizne (%)'),
        ('overhead_rate', 10.00, 'percentage', 'Koszty ogolne (%)'),
        ('profit_margin', 20.00, 'percentage', 'Marza zysku (%)'),
        ('waste_factor', 5.00, 'percentage', 'Wspolczynnik odpadow (%)'),
        ('hourly_rate', 80.00, 'fixed', 'Stawka godzinowa (PLN)'),
        ('machine_rate', 50.00, 'fixed', 'Stawka maszynowa (PLN/h)')
      ON CONFLICT (setting_key) DO NOTHING;

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_material_prices_type ON material_prices(material_type);
      CREATE INDEX IF NOT EXISTS idx_material_prices_active ON material_prices(active);
      CREATE INDEX IF NOT EXISTS idx_production_settings_key ON production_settings(setting_key);
    `,
  },
  {
    name: '010_create_bom_tables',
    up: `
      -- BOM Templates (reusable product templates)
      CREATE TABLE IF NOT EXISTS bom_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        product_category VARCHAR(100),
        version VARCHAR(20) DEFAULT '1.0',
        is_active BOOLEAN DEFAULT true,
        total_material_cost DECIMAL(12,2),
        total_labor_hours DECIMAL(8,2),
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- BOM Template Items (materials/components in template)
      CREATE TABLE IF NOT EXISTS bom_template_items (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('material', 'component', 'labor', 'service')),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        sku VARCHAR(100),
        unit VARCHAR(30) NOT NULL,
        quantity DECIMAL(12,4) NOT NULL,
        unit_cost DECIMAL(12,4),
        waste_percentage DECIMAL(5,2) DEFAULT 0,
        supplier VARCHAR(200),
        lead_time_days INTEGER,
        is_critical BOOLEAN DEFAULT false,
        sequence_order INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Order BOM (instance of BOM for specific order)
      CREATE TABLE IF NOT EXISTS order_bom (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        template_id INTEGER REFERENCES bom_templates(id) ON DELETE SET NULL,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_production', 'completed')),
        total_material_cost DECIMAL(12,2),
        total_labor_cost DECIMAL(12,2),
        total_cost DECIMAL(12,2),
        notes TEXT,
        confirmed_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        confirmed_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id)
      );

      -- Order BOM Items (actual materials used in order)
      CREATE TABLE IF NOT EXISTS order_bom_items (
        id SERIAL PRIMARY KEY,
        order_bom_id INTEGER NOT NULL REFERENCES order_bom(id) ON DELETE CASCADE,
        template_item_id INTEGER REFERENCES bom_template_items(id) ON DELETE SET NULL,
        item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('material', 'component', 'labor', 'service')),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        sku VARCHAR(100),
        unit VARCHAR(30) NOT NULL,
        quantity_planned DECIMAL(12,4) NOT NULL,
        quantity_used DECIMAL(12,4),
        unit_cost DECIMAL(12,4),
        total_cost DECIMAL(12,2),
        waste_quantity DECIMAL(12,4),
        batch_number VARCHAR(100),
        is_issued BOOLEAN DEFAULT false,
        issued_at TIMESTAMP WITH TIME ZONE,
        issued_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_bom_templates_category ON bom_templates(product_category);
      CREATE INDEX IF NOT EXISTS idx_bom_templates_active ON bom_templates(is_active);
      CREATE INDEX IF NOT EXISTS idx_bom_template_items_template ON bom_template_items(template_id);
      CREATE INDEX IF NOT EXISTS idx_bom_template_items_type ON bom_template_items(item_type);
      CREATE INDEX IF NOT EXISTS idx_order_bom_order ON order_bom(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_bom_status ON order_bom(status);
      CREATE INDEX IF NOT EXISTS idx_order_bom_items_bom ON order_bom_items(order_bom_id);
      CREATE INDEX IF NOT EXISTS idx_order_bom_items_type ON order_bom_items(item_type);
      CREATE INDEX IF NOT EXISTS idx_order_bom_items_batch ON order_bom_items(batch_number);
    `,
  },
  {
    name: '011_create_traceability_tables',
    up: `
      -- Production batches (lot tracking)
      CREATE TABLE IF NOT EXISTS production_batches (
        id SERIAL PRIMARY KEY,
        batch_number VARCHAR(100) NOT NULL UNIQUE,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        product_name VARCHAR(200),
        quantity INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(30) DEFAULT 'in_production' CHECK (status IN ('in_production', 'completed', 'on_hold', 'rejected')),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        quality_status VARCHAR(30) DEFAULT 'pending' CHECK (quality_status IN ('pending', 'passed', 'failed', 'conditional')),
        notes TEXT,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Batch materials (materials used in a batch with lot numbers)
      CREATE TABLE IF NOT EXISTS batch_materials (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
        material_name VARCHAR(200) NOT NULL,
        material_lot VARCHAR(100),
        supplier VARCHAR(200),
        quantity_used DECIMAL(12,4) NOT NULL,
        unit VARCHAR(30) NOT NULL,
        expiry_date DATE,
        certificate_number VARCHAR(100),
        order_bom_item_id INTEGER REFERENCES order_bom_items(id) ON DELETE SET NULL,
        added_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Production events (genealogy/audit trail for production)
      CREATE TABLE IF NOT EXISTS production_events (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER REFERENCES production_batches(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
          'batch_created', 'batch_completed', 'batch_rejected', 'batch_on_hold',
          'material_added', 'material_consumed',
          'stage_started', 'stage_completed', 'stage_paused',
          'quality_check', 'defect_reported', 'defect_resolved',
          'rework_started', 'rework_completed',
          'parameter_recorded', 'note_added'
        )),
        event_description TEXT,
        event_data JSONB,
        recorded_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Machine parameters log (for process traceability)
      CREATE TABLE IF NOT EXISTS machine_parameters (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER REFERENCES production_batches(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
        parameter_name VARCHAR(100) NOT NULL,
        parameter_value VARCHAR(200),
        unit VARCHAR(30),
        min_value DECIMAL(12,4),
        max_value DECIMAL(12,4),
        is_within_spec BOOLEAN DEFAULT true,
        recorded_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_batches_order ON production_batches(order_id);
      CREATE INDEX IF NOT EXISTS idx_batches_status ON production_batches(status);
      CREATE INDEX IF NOT EXISTS idx_batches_number ON production_batches(batch_number);
      CREATE INDEX IF NOT EXISTS idx_batch_materials_batch ON batch_materials(batch_id);
      CREATE INDEX IF NOT EXISTS idx_batch_materials_lot ON batch_materials(material_lot);
      CREATE INDEX IF NOT EXISTS idx_production_events_batch ON production_events(batch_id);
      CREATE INDEX IF NOT EXISTS idx_production_events_order ON production_events(order_id);
      CREATE INDEX IF NOT EXISTS idx_production_events_type ON production_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_production_events_date ON production_events(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_machine_params_batch ON machine_parameters(batch_id);
      CREATE INDEX IF NOT EXISTS idx_machine_params_machine ON machine_parameters(machine_id);
    `,
  },
  {
    name: '012_add_standard_times',
    up: `
      -- Add standard times to stages (TPZ = setup time, TJ = per-piece time)
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS tpz_minutes DECIMAL(8,2) DEFAULT 0;
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS tj_minutes DECIMAL(8,2) DEFAULT 0;
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS planned_duration_minutes DECIMAL(10,2);
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS actual_duration_minutes DECIMAL(10,2);
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS efficiency_percent DECIMAL(5,2);

      -- Standard times templates for stage types
      CREATE TABLE IF NOT EXISTS stage_time_standards (
        id SERIAL PRIMARY KEY,
        stage_name VARCHAR(100) NOT NULL,
        tpz_minutes DECIMAL(8,2) DEFAULT 0,
        tj_minutes DECIMAL(8,2) DEFAULT 0,
        description TEXT,
        machine_type VARCHAR(100),
        complexity_factor DECIMAL(4,2) DEFAULT 1.0,
        active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(stage_name, machine_type)
      );

      -- Insert default standards for PlexiSystem stages
      INSERT INTO stage_time_standards (stage_name, tpz_minutes, tj_minutes, description) VALUES
        ('HANDLOWIEC', 15, 5, 'Przygotowanie oferty i zamówienia'),
        ('GRAFIK', 30, 15, 'Projektowanie graficzne'),
        ('FREZOWANIE/LASER', 20, 2, 'Cięcie CNC/laser - zależne od materiału'),
        ('POLEROWANIE', 10, 1.5, 'Polerowanie krawędzi'),
        ('WYGINANIE', 15, 3, 'Gięcie termiczne plexi'),
        ('KLEJENIE', 10, 2, 'Klejenie elementów'),
        ('DRUKOWANIE', 15, 1, 'Druk UV/solwentowy'),
        ('OKLEJANIE', 10, 2, 'Aplikacja folii'),
        ('PAKOWANIE', 10, 1, 'Pakowanie produktu'),
        ('WYSYŁKA', 10, 0.5, 'Przygotowanie do wysyłki'),
        ('FAKTURA', 5, 1, 'Wystawienie faktury'),
        ('ZAMKNIĘCIE', 5, 0.5, 'Zamknięcie zlecenia')
      ON CONFLICT (stage_name, machine_type) DO NOTHING;

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_stage_time_standards_name ON stage_time_standards(stage_name);
      CREATE INDEX IF NOT EXISTS idx_stage_time_standards_active ON stage_time_standards(active);
    `,
  },
  {
    name: '013_add_resource_scheduling',
    up: `
      -- Add machine assignment to stages
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL;
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE;
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE;

      -- Add scheduling to assignments
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE;
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE;
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS notes TEXT;

      -- Resource conflicts log
      CREATE TABLE IF NOT EXISTS resource_conflicts (
        id SERIAL PRIMARY KEY,
        conflict_type VARCHAR(30) NOT NULL CHECK (conflict_type IN ('worker', 'machine', 'stage')),
        resource_id INTEGER NOT NULL,
        resource_name VARCHAR(200),
        conflicting_assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
        conflicting_stage_id INTEGER REFERENCES stages(id) ON DELETE CASCADE,
        existing_assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL,
        existing_stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
        conflict_start TIMESTAMP WITH TIME ZONE,
        conflict_end TIMESTAMP WITH TIME ZONE,
        resolution VARCHAR(30) CHECK (resolution IN ('ignored', 'rescheduled', 'cancelled', 'auto_resolved')),
        resolved_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_stages_machine_id ON stages(machine_id);
      CREATE INDEX IF NOT EXISTS idx_stages_scheduled ON stages(scheduled_start, scheduled_end);
      CREATE INDEX IF NOT EXISTS idx_assignments_scheduled ON assignments(scheduled_start, scheduled_end);
      CREATE INDEX IF NOT EXISTS idx_resource_conflicts_type ON resource_conflicts(conflict_type);
      CREATE INDEX IF NOT EXISTS idx_resource_conflicts_resource ON resource_conflicts(resource_id);
    `,
  },
  {
    name: '014_create_backup_logs',
    up: `
      -- Backup logs table
      CREATE TABLE IF NOT EXISTS backup_logs (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filepath VARCHAR(500),
        file_size BIGINT,
        backup_type VARCHAR(30) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'restore', 'delete')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- System backup settings
      CREATE TABLE IF NOT EXISTS backup_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT,
        updated_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Insert default backup settings
      INSERT INTO backup_settings (setting_key, setting_value, description) VALUES
        ('auto_backup_enabled', 'true', 'Enable automatic daily backups'),
        ('backup_hour', '3', 'Hour of day for automatic backup (0-23)'),
        ('backup_retention_days', '30', 'Number of days to keep backups'),
        ('max_backup_count', '30', 'Maximum number of backup files to keep'),
        ('backup_directory', '/var/backups/plexisystem', 'Directory for backup files')
      ON CONFLICT (setting_key) DO NOTHING;

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
      CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON backup_logs(backup_type);
      CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at);
    `,
  },
  {
    name: '015_create_integrations',
    up: `
      -- External integrations configuration
      CREATE TABLE IF NOT EXISTS integrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(200) NOT NULL,
        description TEXT,
        provider VARCHAR(50) NOT NULL,
        is_enabled BOOLEAN DEFAULT false,
        config JSONB DEFAULT '{}',
        credentials JSONB DEFAULT '{}',
        last_sync_at TIMESTAMP WITH TIME ZONE,
        last_sync_status VARCHAR(30),
        last_sync_message TEXT,
        sync_interval_minutes INTEGER DEFAULT 60,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Integration sync logs
      CREATE TABLE IF NOT EXISTS integration_logs (
        id SERIAL PRIMARY KEY,
        integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'partial')),
        request_data JSONB,
        response_data JSONB,
        error_message TEXT,
        records_processed INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        duration_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice sync mapping (local orders to external invoices)
      CREATE TABLE IF NOT EXISTS invoice_sync (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
        external_id VARCHAR(100),
        external_number VARCHAR(100),
        sync_status VARCHAR(30) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'cancelled')),
        invoice_type VARCHAR(30) CHECK (invoice_type IN ('proforma', 'invoice', 'correction')),
        invoice_data JSONB,
        synced_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, integration_id, invoice_type)
      );

      -- Insert default integrations
      INSERT INTO integrations (name, display_name, description, provider, config) VALUES
        ('wfirma', 'wFirma.pl', 'Integracja z systemem fakturowania wFirma.pl - automatyczne wystawianie faktur', 'wfirma',
         '{"api_url": "https://api2.wfirma.pl", "company_id": "", "auto_create_invoice": false, "default_series": "", "payment_method": "transfer", "payment_days": 14}'::jsonb),
        ('baselinker', 'BaseLinker', 'Integracja z BaseLinker - synchronizacja zamówień z marketplace', 'baselinker',
         '{"api_url": "https://api.baselinker.com/connector.php", "auto_sync_orders": false, "sync_statuses": true}'::jsonb),
        ('allegro', 'Allegro', 'Integracja z Allegro - pobieranie zamówień', 'allegro',
         '{"sandbox": false, "auto_import_orders": false}'::jsonb),
        ('apaczka', 'Apaczka.pl', 'Integracja z Apaczka.pl - nadawanie przesyłek kurierskich', 'apaczka',
         '{"api_url": "https://www.apaczka.pl/api/v2", "default_service": "UPS_STANDARD", "sender_address": {}, "auto_create_shipment": false}'::jsonb)
      ON CONFLICT (name) DO NOTHING;

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_integrations_name ON integrations(name);
      CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(is_enabled);
      CREATE INDEX IF NOT EXISTS idx_integration_logs_integration ON integration_logs(integration_id);
      CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
      CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_invoice_sync_order ON invoice_sync(order_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_sync_external ON invoice_sync(external_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_sync_status ON invoice_sync(sync_status);
    `,
  },
  {
    name: '016_add_order_closing_validation',
    up: `
      -- Add closed_at and closed_by columns to orders
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_by INTEGER REFERENCES workers(id) ON DELETE SET NULL;

      -- Add is_sequential flag to stages for parallel/sequential execution
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS is_sequential BOOLEAN DEFAULT true;
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true;

      -- Ensure sequence_order exists on stages
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

      -- Create index for stage sequence
      CREATE INDEX IF NOT EXISTS idx_stages_sequence ON stages(order_id, sequence_order);
      CREATE INDEX IF NOT EXISTS idx_stages_required ON stages(is_required);

      -- Add started_at for stages
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE stages ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
    `,
  },
  {
    name: '017_create_inventory_module',
    up: `
      -- Kategorie materialow
      CREATE TABLE IF NOT EXISTS material_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        parent_id INTEGER REFERENCES material_categories(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Materialy (katalog)
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        unit VARCHAR(20) NOT NULL CHECK (unit IN ('szt', 'm2', 'mb', 'kg', 'l', 'ark')),
        category_id INTEGER REFERENCES material_categories(id) ON DELETE SET NULL,
        thickness_mm DECIMAL(6,2),
        width_mm DECIMAL(8,2),
        height_mm DECIMAL(8,2),
        color VARCHAR(100),
        supplier VARCHAR(200),
        supplier_code VARCHAR(100),
        min_stock DECIMAL(10,2) DEFAULT 0,
        max_stock DECIMAL(10,2),
        reorder_point DECIMAL(10,2),
        unit_cost DECIMAL(12,4),
        last_purchase_price DECIMAL(12,4),
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Lokacje magazynowe
      CREATE TABLE IF NOT EXISTS storage_locations (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        warehouse VARCHAR(100) DEFAULT 'Magazyn glowny',
        zone VARCHAR(50),
        aisle VARCHAR(20),
        rack VARCHAR(20),
        shelf VARCHAR(20),
        bin VARCHAR(20),
        capacity_max DECIMAL(12,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Stany magazynowe
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        location_id INTEGER REFERENCES storage_locations(id) ON DELETE SET NULL,
        batch_number VARCHAR(100),
        serial_number VARCHAR(100),
        quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
        reserved_quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
        available_quantity DECIMAL(12,4) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
        unit_cost DECIMAL(12,4),
        total_value DECIMAL(14,2) GENERATED ALWAYS AS (quantity * COALESCE(unit_cost, 0)) STORED,
        expiry_date DATE,
        received_date DATE DEFAULT CURRENT_DATE,
        last_counted_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(material_id, location_id, batch_number)
      );

      -- Transakcje magazynowe
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        transaction_number VARCHAR(50) UNIQUE NOT NULL,
        item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('PZ', 'WZ', 'MM', 'MM_IN', 'MM_OUT', 'ADJUST', 'RESERVE', 'RELEASE', 'COUNT')),
        quantity DECIMAL(12,4) NOT NULL,
        quantity_before DECIMAL(12,4),
        quantity_after DECIMAL(12,4),
        unit_cost DECIMAL(12,4),
        total_cost DECIMAL(14,2),
        reference_type VARCHAR(50),
        reference_id INTEGER,
        reference_number VARCHAR(100),
        from_location_id INTEGER REFERENCES storage_locations(id) ON DELETE SET NULL,
        to_location_id INTEGER REFERENCES storage_locations(id) ON DELETE SET NULL,
        supplier VARCHAR(200),
        supplier_document VARCHAR(100),
        notes TEXT,
        worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Rezerwacje materialow dla zlecen
      CREATE TABLE IF NOT EXISTS material_reservations (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        order_bom_item_id INTEGER REFERENCES order_bom_items(id) ON DELETE SET NULL,
        inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        quantity_reserved DECIMAL(12,4) NOT NULL,
        quantity_issued DECIMAL(12,4) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'reserved' CHECK (status IN ('reserved', 'partially_issued', 'issued', 'cancelled')),
        reserved_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        issued_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        issued_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(code);
      CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
      CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_material ON inventory_items(material_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_batch ON inventory_items(batch_number);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ref ON inventory_transactions(reference_type, reference_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_material_reservations_order ON material_reservations(order_id);
      CREATE INDEX IF NOT EXISTS idx_material_reservations_item ON material_reservations(inventory_item_id);
      CREATE INDEX IF NOT EXISTS idx_material_reservations_status ON material_reservations(status);

      -- Insert default categories for PlexiSystem
      INSERT INTO material_categories (name, description) VALUES
        ('Plyty plexi', 'Plyty akrylowe PMMA'),
        ('Plyty PC', 'Plyty poliweglanowe'),
        ('Kleje', 'Kleje do pleksi i tworzyw'),
        ('Akcesoria', 'Akcesoria montazowe'),
        ('Opakowania', 'Materialy opakowaniowe'),
        ('Folie', 'Folie ochronne i dekoracyjne'),
        ('Profile', 'Profile aluminiowe i plastikowe'),
        ('Srodki czyszczace', 'Srodki do czyszczenia i konserwacji')
      ON CONFLICT DO NOTHING;

      -- Insert default storage locations for PlexiSystem
      INSERT INTO storage_locations (code, name, warehouse, zone) VALUES
        ('MAG-A-1', 'Regal A - Polka 1', 'Magazyn glowny', 'Plyty'),
        ('MAG-A-2', 'Regal A - Polka 2', 'Magazyn glowny', 'Plyty'),
        ('MAG-A-3', 'Regal A - Polka 3', 'Magazyn glowny', 'Plyty'),
        ('MAG-B-1', 'Regal B - Polka 1', 'Magazyn glowny', 'Plyty grube'),
        ('MAG-B-2', 'Regal B - Polka 2', 'Magazyn glowny', 'Plyty grube'),
        ('MAG-C-1', 'Regal C - Dolna', 'Magazyn glowny', 'Akcesoria'),
        ('MAG-C-2', 'Regal C - Gorna', 'Magazyn glowny', 'Kleje'),
        ('MAG-D-1', 'Strefa przyjeccia', 'Magazyn glowny', 'Wejscie'),
        ('WYD-1', 'Strefa wydan', 'Magazyn glowny', 'Wyjscie'),
        ('PROD-1', 'Przy maszynie CNC', 'Hala produkcyjna', 'Produkcja'),
        ('PROD-2', 'Przy laserze', 'Hala produkcyjna', 'Produkcja')
      ON CONFLICT (code) DO NOTHING;

      -- Insert example materials for PlexiSystem
      INSERT INTO materials (code, name, unit, category_id, thickness_mm, min_stock, supplier) VALUES
        ('PLEX-CLEAR-3', 'Plyta plexi bezbarwna 3mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 3, 10, 'Plast-Met'),
        ('PLEX-CLEAR-5', 'Plyta plexi bezbarwna 5mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 5, 10, 'Plast-Met'),
        ('PLEX-CLEAR-8', 'Plyta plexi bezbarwna 8mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 8, 5, 'Plast-Met'),
        ('PLEX-CLEAR-10', 'Plyta plexi bezbarwna 10mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 10, 5, 'Plast-Met'),
        ('PLEX-WHITE-3', 'Plyta plexi biala 3mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 3, 10, 'Plast-Met'),
        ('PLEX-WHITE-5', 'Plyta plexi biala 5mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 5, 5, 'Plast-Met'),
        ('PLEX-BLK-3', 'Plyta plexi czarna 3mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 3, 5, 'Plast-Met'),
        ('PLEX-BLK-5', 'Plyta plexi czarna 5mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 5, 5, 'Plast-Met'),
        ('PLEX-OPAL-3', 'Plyta plexi opal 3mm 2050x3050', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty plexi'), 3, 5, 'Plast-Met'),
        ('PC-CLEAR-3', 'Plyta poliweglan bezbarwny 3mm', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty PC'), 3, 5, 'Bayer'),
        ('PC-CLEAR-5', 'Plyta poliweglan bezbarwny 5mm', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Plyty PC'), 5, 3, 'Bayer'),
        ('KLEJ-ACRIFIX-192', 'Klej Acrifix 192 50ml', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Kleje'), NULL, 20, 'Evonik'),
        ('KLEJ-ACRIFIX-116', 'Klej Acrifix 116 1kg', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Kleje'), NULL, 5, 'Evonik'),
        ('KLEJ-CYANO', 'Klej cyjanoakrylowy 20g', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Kleje'), NULL, 30, 'Loctite'),
        ('PROFIL-AL-U-10', 'Profil aluminiowy U 10mm 2m', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Profile'), NULL, 50, 'Aluprofil'),
        ('PROFIL-AL-L-20', 'Profil aluminiowy L 20mm 2m', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Profile'), NULL, 30, 'Aluprofil'),
        ('FOLIA-OCHRONNA', 'Folia ochronna samoprzylepna', 'mb',
         (SELECT id FROM material_categories WHERE name = 'Folie'), NULL, 100, 'Novatex'),
        ('KARTON-3W-600', 'Karton 3-warstwowy 600x400x400', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Opakowania'), NULL, 50, 'Kartpol'),
        ('FOLIA-STRETCH', 'Folia stretch 500mm', 'szt',
         (SELECT id FROM material_categories WHERE name = 'Opakowania'), NULL, 10, 'Folpak')
      ON CONFLICT (code) DO NOTHING;
    `,
  },
  {
    name: '018_integrate_bom_with_inventory',
    up: `
      -- Add material_id and inventory_item_id to order_bom_items
      ALTER TABLE order_bom_items ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL;
      ALTER TABLE order_bom_items ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL;
      ALTER TABLE order_bom_items ADD COLUMN IF NOT EXISTS reservation_id INTEGER REFERENCES material_reservations(id) ON DELETE SET NULL;

      -- Add material_id to bom_template_items for quick material lookup
      ALTER TABLE bom_template_items ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL;

      -- Index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_order_bom_items_material ON order_bom_items(material_id);
      CREATE INDEX IF NOT EXISTS idx_order_bom_items_inventory ON order_bom_items(inventory_item_id);
      CREATE INDEX IF NOT EXISTS idx_bom_template_items_material ON bom_template_items(material_id);
    `,
  },
  {
    name: '019_create_time_tracking_module',
    up: `
      -- Work time entries (rejestracja czasu pracy - wejścia/wyjścia)
      CREATE TABLE IF NOT EXISTS work_time_entries (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
        exit_time TIMESTAMP WITH TIME ZONE,
        shift VARCHAR(20) DEFAULT 'DZIEŃ' CHECK (shift IN ('DZIEŃ', 'NOC', 'SOBOTA', 'NIEDZIELĘ')),
        entry_time_smoothed TIMESTAMP WITH TIME ZONE,
        exit_time_smoothed TIMESTAMP WITH TIME ZONE,
        work_minutes INTEGER,
        work_minutes_smoothed INTEGER,
        overtime_minutes INTEGER DEFAULT 0,
        break_minutes INTEGER DEFAULT 0,
        notes TEXT,
        source VARCHAR(30) DEFAULT 'manual' CHECK (source IN ('manual', 'pin', 'card', 'auto')),
        created_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        approved_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Days off (dni wolne - urlopy, zwolnienia)
      CREATE TABLE IF NOT EXISTS days_off (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        type VARCHAR(30) NOT NULL CHECK (type IN (
          'URLOP_WYPOCZYNKOWY',
          'URLOP_NA_ZADANIE',
          'ZWOLNIENIE_LEKARSKIE',
          'URLOP_OKOLICZNOSCIOWY',
          'URLOP_BEZPLATNY',
          'URLOP_MACIERZYNSKI',
          'URLOP_RODZICIELSKI',
          'DELEGACJA',
          'SZKOLENIE',
          'INNE'
        )),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
        notes TEXT,
        requested_by INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        approved_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Worker monthly summary cache (podsumowanie miesięczne)
      CREATE TABLE IF NOT EXISTS worker_monthly_summary (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        work_days INTEGER DEFAULT 0,
        absence_days INTEGER DEFAULT 0,
        total_work_minutes INTEGER DEFAULT 0,
        total_work_minutes_smoothed INTEGER DEFAULT 0,
        base_minutes_smoothed INTEGER DEFAULT 0,
        overtime_minutes_smoothed INTEGER DEFAULT 0,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(worker_id, year, month)
      );

      -- Time smoothing settings (ustawienia wygładzania czasu)
      CREATE TABLE IF NOT EXISTS time_smoothing_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value INTEGER NOT NULL,
        description TEXT,
        updated_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Insert default time smoothing settings
      INSERT INTO time_smoothing_settings (setting_key, setting_value, description) VALUES
        ('smoothing_interval_minutes', 15, 'Interwał zaokrąglania czasu (minuty)'),
        ('entry_round_minutes', 15, 'Zaokrąglenie czasu wejścia (minuty)'),
        ('exit_round_minutes', 15, 'Zaokrąglenie czasu wyjścia (minuty)'),
        ('work_day_minutes', 480, 'Podstawowy czas pracy dziennie (8h = 480 min)'),
        ('overtime_threshold_minutes', 480, 'Próg nadgodzin (minuty)'),
        ('max_work_minutes', 720, 'Maksymalny czas pracy dziennie (12h = 720 min)'),
        ('default_break_minutes', 30, 'Domyślna przerwa (minuty)')
      ON CONFLICT (setting_key) DO NOTHING;

      -- Indexes for work_time_entries
      CREATE INDEX IF NOT EXISTS idx_work_time_entries_worker ON work_time_entries(worker_id);
      CREATE INDEX IF NOT EXISTS idx_work_time_entries_entry_time ON work_time_entries(entry_time);
      CREATE INDEX IF NOT EXISTS idx_work_time_entries_approved ON work_time_entries(approved_at);

      -- Indexes for days_off
      CREATE INDEX IF NOT EXISTS idx_days_off_worker ON days_off(worker_id);
      CREATE INDEX IF NOT EXISTS idx_days_off_dates ON days_off(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_days_off_type ON days_off(type);
      CREATE INDEX IF NOT EXISTS idx_days_off_status ON days_off(status);

      -- Indexes for worker_monthly_summary
      CREATE INDEX IF NOT EXISTS idx_worker_monthly_summary_worker ON worker_monthly_summary(worker_id);
      CREATE INDEX IF NOT EXISTS idx_worker_monthly_summary_period ON worker_monthly_summary(year, month);
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
