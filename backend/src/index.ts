import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { testConnection } from './db/pool.js';
import { runMigrations } from './db/migrations/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { recalculateEventCosts } from './utils/recalculateCosts.js';
import { query } from './db/pool.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import eventRoutes from './routes/events.js';
import paymentRoutes from './routes/payments.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin/index.js';
import galleryRoutes from './routes/gallery.js';

const app = express();

// Trust proxy (for nginx reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - support multiple origins
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = config.cors.origin.split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Auth endpoints have stricter limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gallery', galleryRoutes);

// Serve uploaded gallery files
app.use('/uploads', express.static('/app/uploads'));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Run migrations
    await runMigrations();

    // Recalculate all even-split event costs on startup
    // Ensures costs are in sync after deploys or manual DB changes
    const evenEvents = await query<{ id: string }>(
      `SELECT id FROM events WHERE split_type IN ('even', 'fixed') AND total_cost > 0`
    );
    for (const event of evenEvents) {
      await recalculateEventCosts(event.id);
    }
    if (evenEvents.length > 0) {
      logger.info(`Recalculated costs for ${evenEvents.length} even-split events on startup`);
    }

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
