import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import { corsMiddleware } from '../middleware/cors';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Import routes
import authRoutes from '../routes/auth';
import workersRoutes from '../routes/workers';
import ordersRoutes from '../routes/orders';
import machinesRoutes from '../routes/machines';
import qualityRoutes from '../routes/quality';
import maintenanceRoutes from '../routes/maintenance';
import auditRoutes from '../routes/audit';
import stagesRoutes from '../routes/stages';
import assignmentsRoutes from '../routes/assignments';
import workSessionsRoutes from '../routes/work-sessions';
import costsRoutes from '../routes/costs';
import bomRoutes from '../routes/bom';
import inventoryRoutes from '../routes/inventory';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

/**
 * Create test Express app without starting server
 */
export const createTestApp = (): Express => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', environment: 'test' });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/workers', workersRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/machines', machinesRoutes);
  app.use('/api/quality', qualityRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/stages', stagesRoutes);
  app.use('/api/assignments', assignmentsRoutes);
  app.use('/api/work-sessions', workSessionsRoutes);
  app.use('/api/costs', costsRoutes);
  app.use('/api/bom', bomRoutes);
  app.use('/api/inventory', inventoryRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

/**
 * Generate test JWT token for authentication
 */
export const generateTestToken = (payload: {
  id: number;
  email: string;
  role: string;
  name?: string;
}): string => {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name || 'Test User',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Test user fixtures
 * Roles: ADMIN, MANAGER, KIEROWNIK, HANDLOWIEC, GRAFIK, PRACOWNIK
 */
export const testUsers = {
  admin: {
    id: 1,
    email: 'admin@test.pl',
    role: 'ADMIN',
    name: 'Test Admin',
  },
  manager: {
    id: 2,
    email: 'kierownik@test.pl',
    role: 'MANAGER', // Used by requireRole checks
    name: 'Test Kierownik',
  },
  worker: {
    id: 3,
    email: 'pracownik@test.pl',
    role: 'PRACOWNIK',
    name: 'Test Pracownik',
  },
};

/**
 * Get auth header for test requests
 */
export const getAuthHeader = (user: typeof testUsers.admin) => ({
  Authorization: `Bearer ${generateTestToken(user)}`,
});

/**
 * Test order fixtures
 */
export const testOrders = {
  basic: {
    order_number: 'TEST-001',
    client_name: 'Test Client',
    product_name: 'Test Product',
    quantity: 10,
    price_total: 1000,
  },
  withDetails: {
    order_number: 'TEST-002',
    client_order_number: 'CLIENT-001',
    client_name: 'Test Client 2',
    client_email: 'client@test.pl',
    client_phone: '123456789',
    product_name: 'Test Product 2',
    quantity: 20,
    price_total: 2000,
    price_per_unit: 100,
    planned_completion_date: '2025-01-15',
    notes: 'Test notes',
  },
};

/**
 * Test worker fixtures
 */
export const testWorkers = {
  basic: {
    name: 'New Worker',
    email: 'newworker@test.pl',
    pin: '1234',
    position: 'Operator',
    role: 'PRACOWNIK',
  },
};

/**
 * Mock database query function for unit tests
 */
export const mockQuery = jest.fn();

/**
 * Reset all mocks between tests
 */
export const resetMocks = () => {
  mockQuery.mockReset();
  jest.clearAllMocks();
};
