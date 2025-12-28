"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../src/config/database");
const logger_1 = require("../src/utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DEFAULT_PASSWORD = 'plexisystem123';
const workers = [
    { name: 'Katarzyna Treder', email: 'katarzyna@plexisystem.pl', position: 'GRAFIK', hourly_rate: 43.27, role: 'WORKER' },
    { name: 'Nikola Treder', email: 'nikola@plexisystem.pl', position: 'GRAFIK', hourly_rate: 43.27, role: 'WORKER' },
    { name: 'Monika Pyzdrowska', email: 'monika@plexisystem.pl', position: 'OKLEJANIE', hourly_rate: 43.27, role: 'WORKER' },
    { name: 'Millena Milewska', email: 'millena@plexisystem.pl', position: 'PAKOWANIE', hourly_rate: 43.27, role: 'WORKER' },
    { name: 'Małgorzata Czepczyńska', email: 'malgorzata@plexisystem.pl', position: 'KLEJENIE', hourly_rate: 43.27, role: 'WORKER' },
    { name: 'Łukasz Baranowski', email: 'lukasz@plexisystem.pl', position: 'FREZOWANIE', hourly_rate: 52.88, role: 'WORKER' },
    { name: 'Sławomir Sikorra', email: 'slawomir@plexisystem.pl', position: 'WYSYŁKA', hourly_rate: 52.88, role: 'WORKER' },
    { name: 'Daniel Treder', email: 'daniel@plexisystem.pl', position: 'FREZOWANIE', hourly_rate: 62.50, role: 'MANAGER' },
    { name: 'Łukasz Sikorra', email: 'lukasz.sikorra@plexisystem.pl', position: 'HANDLOWIEC', hourly_rate: 62.50, role: 'MANAGER' },
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
    logger_1.logger.info('Seeding workers...');
    const passwordHash = await bcryptjs_1.default.hash(DEFAULT_PASSWORD, 10);
    for (const worker of workers) {
        try {
            await (0, database_1.query)(`INSERT INTO workers (name, email, password_hash, position, hourly_rate, role, active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           position = EXCLUDED.position,
           hourly_rate = EXCLUDED.hourly_rate,
           role = EXCLUDED.role`, [worker.name, worker.email, passwordHash, worker.position, worker.hourly_rate, worker.role]);
            logger_1.logger.info(`  ✓ Worker: ${worker.name} (${worker.email})`);
        }
        catch (error) {
            logger_1.logger.error(`  ✗ Failed to seed worker ${worker.name}:`, error);
        }
    }
};
const seedOrders = async () => {
    logger_1.logger.info('Seeding orders with stages...');
    for (const order of sampleOrders) {
        try {
            // Check if order exists
            const existingOrder = await (0, database_1.query)('SELECT id FROM orders WHERE order_number = $1', [order.order_number]);
            let orderId;
            if (existingOrder.rows.length > 0) {
                orderId = existingOrder.rows[0].id;
                logger_1.logger.info(`  ↻ Order ${order.order_number} already exists, skipping creation`);
            }
            else {
                const orderResult = await (0, database_1.query)(`INSERT INTO orders (
            order_number, client_order_number, client_name, client_email, client_phone,
            product_name, quantity, price_total, price_per_unit, status,
            planned_completion_date, notes, folder_path, invoice_number, invoice_date,
            created_by, archived
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id`, [
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
                ]);
                orderId = orderResult.rows[0].id;
                logger_1.logger.info(`  ✓ Order: ${order.order_number}`);
                // Create stages for the order
                for (let i = 0; i < stages.length; i++) {
                    const stage = stages[i];
                    await (0, database_1.query)(`INSERT INTO stages (order_id, stage_number, stage_name, is_required, status, sequence_order)
             VALUES ($1, $2, $3, $4, 'NOWY', $5)`, [orderId, stage.stage_number, stage.stage_name, stage.is_required, i + 1]);
                }
                logger_1.logger.info(`    ✓ Created ${stages.length} stages for order ${order.order_number}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`  ✗ Failed to seed order ${order.order_number}:`, error);
        }
    }
};
const seedSampleAssignments = async () => {
    logger_1.logger.info('Seeding sample assignments...');
    try {
        // Get some workers
        const workersResult = await (0, database_1.query)('SELECT id, name FROM workers LIMIT 3');
        const workersList = workersResult.rows;
        if (workersList.length === 0) {
            logger_1.logger.warn('  No workers found, skipping assignments');
            return;
        }
        // Get order 1414/2025 (W_TRAKCIE)
        const orderResult = await (0, database_1.query)(`SELECT o.id, s.id as stage_id, s.stage_name
       FROM orders o
       JOIN stages s ON o.id = s.order_id
       WHERE o.order_number = '1414/2025'
       ORDER BY s.sequence_order
       LIMIT 2`);
        if (orderResult.rows.length > 0) {
            for (let i = 0; i < orderResult.rows.length; i++) {
                const stage = orderResult.rows[i];
                const worker = workersList[i % workersList.length];
                // Check if assignment exists
                const existingAssignment = await (0, database_1.query)('SELECT id FROM assignments WHERE stage_id = $1 AND worker_id = $2', [stage.stage_id, worker.id]);
                if (existingAssignment.rows.length === 0) {
                    await (0, database_1.query)(`INSERT INTO assignments (stage_id, worker_id, status)
             VALUES ($1, $2, 'NOWY')`, [stage.stage_id, worker.id]);
                    logger_1.logger.info(`    ✓ Assigned ${worker.name} to ${stage.stage_name}`);
                    // Update stage status
                    await (0, database_1.query)(`UPDATE stages SET status = 'NOWY' WHERE id = $1`, [stage.stage_id]);
                }
            }
        }
    }
    catch (error) {
        logger_1.logger.error('  ✗ Failed to seed assignments:', error);
    }
};
const runSeed = async () => {
    logger_1.logger.info('Starting database seeding...');
    logger_1.logger.info(`Default password for all users: ${DEFAULT_PASSWORD}`);
    try {
        await seedWorkers();
        await seedOrders();
        await seedSampleAssignments();
        logger_1.logger.info('✅ Seeding completed successfully');
        logger_1.logger.info('');
        logger_1.logger.info('=== Login Credentials ===');
        logger_1.logger.info('Manager: daniel@plexisystem.pl / plexisystem123');
        logger_1.logger.info('Manager: lukasz.sikorra@plexisystem.pl / plexisystem123');
        logger_1.logger.info('Worker:  katarzyna@plexisystem.pl / plexisystem123');
        logger_1.logger.info('=========================');
    }
    catch (error) {
        logger_1.logger.error('❌ Seeding failed:', error);
        process.exit(1);
    }
    finally {
        await database_1.pool.end();
    }
};
runSeed();
//# sourceMappingURL=seed.js.map