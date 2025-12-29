import bcrypt from 'bcryptjs';
import { pool, query } from '../src/config/database';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PASSWORD = 'plexisystem123';

// Nowy system ról:
// ADMIN - właściciel, pełne uprawnienia (może być też grafikiem)
// GRAFIK - przygotowuje pliki produkcyjne
// HANDLOWIEC - zakłada zlecenia, obserwuje etapy
// KIEROWNIK - zarządza zleceniami, przypisuje pracowników
// PRACOWNIK - wykonuje zadania produkcyjne (NIE widzi cen)

const workers = [
  // ADMIN/Właściciel - także grafik
  {
    name: 'Łukasz Sikorra',
    email: 'lukasz.sikorra@plexisystem.pl',
    pin: '1234',
    position: 'GRAFIK',
    hourly_rate: 62.50,
    role: 'ADMIN',
    skills: ['GRAFIK', 'FREZOWANIE', 'LASER', 'POLEROWANIE', 'WYGINANIE', 'KLEJENIE', 'DRUKOWANIE', 'OKLEJANIE', 'PAKOWANIE']
  },
  // KIEROWNIK produkcji
  {
    name: 'Daniel Treder',
    email: 'daniel@plexisystem.pl',
    pin: '5678',
    position: 'FREZOWANIE',
    hourly_rate: 62.50,
    role: 'KIEROWNIK',
    skills: ['FREZOWANIE', 'LASER', 'POLEROWANIE']
  },
  // GRAFICY
  {
    name: 'Katarzyna Treder',
    email: 'katarzyna@plexisystem.pl',
    pin: '1111',
    position: 'GRAFIK',
    hourly_rate: 43.27,
    role: 'GRAFIK',
    skills: ['GRAFIK']
  },
  {
    name: 'Nikola Treder',
    email: 'nikola@plexisystem.pl',
    pin: '2222',
    position: 'GRAFIK',
    hourly_rate: 43.27,
    role: 'GRAFIK',
    skills: ['GRAFIK']
  },
  // PRACOWNICY produkcyjni
  {
    name: 'Monika Pyzdrowska',
    email: 'monika@plexisystem.pl',
    pin: '3333',
    position: 'OKLEJANIE',
    hourly_rate: 43.27,
    role: 'PRACOWNIK',
    skills: ['OKLEJANIE', 'DRUKOWANIE']
  },
  {
    name: 'Millena Milewska',
    email: 'millena@plexisystem.pl',
    pin: '4444',
    position: 'PAKOWANIE',
    hourly_rate: 43.27,
    role: 'PRACOWNIK',
    skills: ['PAKOWANIE']
  },
  {
    name: 'Małgorzata Czepczyńska',
    email: 'malgorzata@plexisystem.pl',
    pin: '5555',
    position: 'KLEJENIE',
    hourly_rate: 43.27,
    role: 'PRACOWNIK',
    skills: ['KLEJENIE', 'WYGINANIE']
  },
  {
    name: 'Łukasz Baranowski',
    email: 'lukasz@plexisystem.pl',
    pin: '6666',
    position: 'FREZOWANIE',
    hourly_rate: 52.88,
    role: 'PRACOWNIK',
    skills: ['FREZOWANIE', 'LASER']
  },
  {
    name: 'Sławomir Sikorra',
    email: 'slawomir@plexisystem.pl',
    pin: '7777',
    position: 'WYSYŁKA',
    hourly_rate: 52.88,
    role: 'PRACOWNIK',
    skills: ['PAKOWANIE', 'WYSYŁKA']
  },
];

const stages = [
  { stage_number: 1, stage_name: 'HANDLOWIEC', is_required: true },
  { stage_number: 2, stage_name: 'GRAFIK', is_required: true },
  { stage_number: 3, stage_name: 'FREZOWANIE/LASER', is_required: true },
  { stage_number: 4, stage_name: 'POLEROWANIE', is_required: false },
  { stage_number: 5, stage_name: 'WYGINANIE', is_required: false },
  { stage_number: 6, stage_name: 'KLEJENIE', is_required: false },
  { stage_number: 7, stage_name: 'DRUKOWANIE', is_required: false },
  { stage_number: 8, stage_name: 'OKLEJANIE', is_required: false },
  { stage_number: 9, stage_name: 'PAKOWANIE', is_required: true },
  { stage_number: 10, stage_name: 'WYSYŁKA', is_required: true },
  { stage_number: 11, stage_name: 'FAKTURA', is_required: true },
  { stage_number: 12, stage_name: 'ZAMKNIĘCIE', is_required: true },
];

const sampleOrders = [
  {
    order_number: '1415/2025',
    client_order_number: 'ZAM-2025-001',
    client_name: 'TEAM POINT Sp. z o.o.',
    client_email: 'kontakt@teampoint.pl',
    client_phone: '+48 12 345 67 89',
    product_name: 'Kieszonka A4 spacewall V2',
    quantity: 1000,
    price_total: 5000.00,
    price_per_unit: 5.00,
    status: 'NOWE',
    planned_completion_date: '2026-01-15',
    notes: 'Specjalne opakowanie, szybka wysyłka',
    folder_path: '/PROJEKTY/TEAM_POINT/1415/',
    created_by: 'Łukasz Sikorra',
  },
  {
    order_number: '1414/2025',
    client_order_number: 'ZAM-2025-002',
    client_name: 'TEAM POINT Sp. z o.o.',
    client_email: 'kontakt@teampoint.pl',
    client_phone: '+48 12 345 67 89',
    product_name: 'Kieszonka na ulotki V2',
    quantity: 2,
    price_total: 150.00,
    price_per_unit: 75.00,
    status: 'W_TRAKCIE',
    planned_completion_date: '2025-12-30',
    created_by: 'Łukasz Sikorra',
  },
  {
    order_number: '1413/2025',
    client_order_number: 'ZAM-2025-003',
    client_name: 'ABC Design Studio',
    client_email: 'zamowienia@abcdesign.pl',
    client_phone: '+48 22 333 44 55',
    product_name: 'Kieszonka A4 spacewall V2',
    quantity: 4,
    price_total: 300.00,
    price_per_unit: 75.00,
    status: 'GOTOWE',
    planned_completion_date: '2025-12-22',
    invoice_number: 'FV/2025/002',
    invoice_date: '2025-12-22',
    created_by: 'Łukasz Sikorra',
    archived: false,
  },
];

const seedWorkers = async () => {
  logger.info('Seeding workers...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const worker of workers) {
    try {
      await query(
        `INSERT INTO workers (name, email, pin, password_hash, position, hourly_rate, role, skills, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           pin = EXCLUDED.pin,
           position = EXCLUDED.position,
           hourly_rate = EXCLUDED.hourly_rate,
           role = EXCLUDED.role,
           skills = EXCLUDED.skills`,
        [
          worker.name,
          worker.email,
          worker.pin,
          passwordHash,
          worker.position,
          worker.hourly_rate,
          worker.role,
          worker.skills
        ]
      );
      logger.info(`  ✓ Worker: ${worker.name} (PIN: ${worker.pin}, Role: ${worker.role})`);
    } catch (error) {
      logger.error(`  ✗ Failed to seed worker ${worker.name}:`, error);
    }
  }
};

const seedOrders = async () => {
  logger.info('Seeding orders with stages...');

  for (const order of sampleOrders) {
    try {
      // Check if order exists
      const existingOrder = await query(
        'SELECT id FROM orders WHERE order_number = $1',
        [order.order_number]
      );

      let orderId: number;

      if (existingOrder.rows.length > 0) {
        orderId = existingOrder.rows[0].id;
        logger.info(`  ↻ Order ${order.order_number} already exists, skipping creation`);
      } else {
        const orderResult = await query(
          `INSERT INTO orders (
            order_number, client_order_number, client_name, client_email, client_phone,
            product_name, quantity, price_total, price_per_unit, status,
            planned_completion_date, notes, folder_path, invoice_number, invoice_date,
            created_by, archived
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id`,
          [
            order.order_number,
            order.client_order_number,
            order.client_name,
            order.client_email,
            order.client_phone,
            order.product_name,
            order.quantity,
            order.price_total,
            order.price_per_unit,
            order.status,
            order.planned_completion_date,
            order.notes || null,
            order.folder_path || null,
            order.invoice_number || null,
            order.invoice_date || null,
            order.created_by,
            order.archived || false,
          ]
        );

        orderId = orderResult.rows[0].id;
        logger.info(`  ✓ Order: ${order.order_number}`);

        // Create stages for the order
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          await query(
            `INSERT INTO stages (order_id, stage_number, stage_name, is_required, status, sequence_order)
             VALUES ($1, $2, $3, $4, 'NOWY', $5)`,
            [orderId, stage.stage_number, stage.stage_name, stage.is_required, i + 1]
          );
        }
        logger.info(`    ✓ Created ${stages.length} stages for order ${order.order_number}`);
      }
    } catch (error) {
      logger.error(`  ✗ Failed to seed order ${order.order_number}:`, error);
    }
  }
};

const seedSampleAssignments = async () => {
  logger.info('Seeding sample assignments...');

  try {
    // Get some workers
    const workersResult = await query('SELECT id, name FROM workers LIMIT 3');
    const workersList = workersResult.rows;

    if (workersList.length === 0) {
      logger.warn('  No workers found, skipping assignments');
      return;
    }

    // Get order 1414/2025 (W_TRAKCIE)
    const orderResult = await query(
      `SELECT o.id, s.id as stage_id, s.stage_name
       FROM orders o
       JOIN stages s ON o.id = s.order_id
       WHERE o.order_number = '1414/2025'
       ORDER BY s.sequence_order
       LIMIT 2`
    );

    if (orderResult.rows.length > 0) {
      for (let i = 0; i < orderResult.rows.length; i++) {
        const stage = orderResult.rows[i];
        const worker = workersList[i % workersList.length];

        // Check if assignment exists
        const existingAssignment = await query(
          'SELECT id FROM assignments WHERE stage_id = $1 AND worker_id = $2',
          [stage.stage_id, worker.id]
        );

        if (existingAssignment.rows.length === 0) {
          await query(
            `INSERT INTO assignments (stage_id, worker_id, status)
             VALUES ($1, $2, 'NOWY')`,
            [stage.stage_id, worker.id]
          );
          logger.info(`    ✓ Assigned ${worker.name} to ${stage.stage_name}`);

          // Update stage status
          await query(
            `UPDATE stages SET status = 'NOWY' WHERE id = $1`,
            [stage.stage_id]
          );
        }
      }
    }
  } catch (error) {
    logger.error('  ✗ Failed to seed assignments:', error);
  }
};

const runSeed = async () => {
  logger.info('Starting database seeding...');
  logger.info(`Default password for all users: ${DEFAULT_PASSWORD}`);

  try {
    await seedWorkers();
    await seedOrders();
    await seedSampleAssignments();

    logger.info('✅ Seeding completed successfully');
    logger.info('');
    logger.info('========== DANE LOGOWANIA (PIN) ==========');
    logger.info('');
    logger.info('ADMIN:');
    logger.info('  Łukasz Sikorra - PIN: 1234');
    logger.info('');
    logger.info('KIEROWNIK:');
    logger.info('  Daniel Treder - PIN: 5678');
    logger.info('');
    logger.info('GRAFICY:');
    logger.info('  Katarzyna Treder - PIN: 1111');
    logger.info('  Nikola Treder - PIN: 2222');
    logger.info('');
    logger.info('PRACOWNICY:');
    logger.info('  Monika Pyzdrowska - PIN: 3333');
    logger.info('  Millena Milewska - PIN: 4444');
    logger.info('  Małgorzata Czepczyńska - PIN: 5555');
    logger.info('  Łukasz Baranowski - PIN: 6666');
    logger.info('  Sławomir Sikorra - PIN: 7777');
    logger.info('');
    logger.info('==========================================');
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runSeed();
