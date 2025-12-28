import express from 'express';
import dotenv from 'dotenv';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { testConnection } from './config/database';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import workersRoutes from './routes/workers';
import ordersRoutes from './routes/orders';
import stagesRoutes from './routes/stages';
import assignmentsRoutes from './routes/assignments';
import workSessionsRoutes from './routes/work-sessions';
import shipmentsRoutes from './routes/shipments';
import reportsRoutes from './routes/reports';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/stages', stagesRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/work-sessions', workSessionsRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/reports', reportsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed - starting server anyway');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 PlexiSystem API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database: ${dbConnected ? 'connected' : 'not connected'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
