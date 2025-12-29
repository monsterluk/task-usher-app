import cors from 'cors';

// Default allowed origins - includes common dev and production URLs
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://beata254.mikrus.xyz:20254',  // Mikrus production
  'https://beata254.mikrus.xyz',         // Mikrus without port
];

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : defaultOrigins;

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) {
      return callback(null, true);
    }

    // Allow all origins if '*' is in the list
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow any origin from mikrus.xyz domain
    if (origin.includes('mikrus.xyz')) {
      return callback(null, true);
    }

    // Allow any localhost origin for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
});
