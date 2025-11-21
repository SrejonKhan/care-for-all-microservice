import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { healthRoute } from './routes/health';
import { campaignRoutes } from './routes/campaigns';
import { connectDatabase, checkDatabaseHealth, disconnectDatabase } from './config/database';
import { initializeRabbitMQ, closeRabbitMQ } from './config/rabbitmq';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'campaign-service',
  required: {
    database: true,
    rabbitmq: false, // Optional for API service (required for worker)
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'campaign-service',
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    enabled: config.OTEL_TRACES_ENABLED,
  });
  logger.info('OpenTelemetry tracing initialized');
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = new OpenAPIHono();

// CORS middleware (if needed for development)
app.use('*', async (c, next) => {
  if (config.NODE_ENV === 'development') {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (c.req.method === 'OPTIONS') {
      return new Response('', { status: 204 });
    }
  }
  await next();
});

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info('Request completed', {
    method,
    path,
    status,
    duration: `${duration}ms`,
  });
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.openapi(healthRoute, async (c) => {
  const dbHealthy = await checkDatabaseHealth();

  return c.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    service: 'campaign-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Mount campaign routes
app.route('/', campaignRoutes);

// ============================================================================
// API DOCUMENTATION
// ============================================================================

// API Documentation UI
app.get(
  '/docs',
  apiReference({
    theme: 'purple',
    spec: {
      url: '/openapi',
    },
  })
);

// OpenAPI spec
app.doc('/openapi', {
  openapi: '3.1.0',
  info: {
    title: 'Campaign Service API',
    version: '1.0.0',
    description: 'Campaign management service for CareForAll platform',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'http://campaign-service:3001',
      description: 'Docker internal',
    },
  ],
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.onError((err, c) => {
  logger.error('Unhandled error', err);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  );
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT || 3001;

// ============================================================================
// DATABASE & RABBITMQ CONNECTION
// ============================================================================

// Connect to MongoDB before starting server
connectDatabase()
  .then(async () => {
    logger.info(`Starting campaign-service on port ${port}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`Database: MongoDB connected`);

    // Initialize RabbitMQ (optional for API service)
    if (config.RABBITMQ_URL) {
      try {
        await initializeRabbitMQ();
        logger.info(`RabbitMQ: connected`);
      } catch (error) {
        logger.warn('RabbitMQ connection failed (non-critical for API service)', error as Record<string, unknown>);
      }
    } else {
      logger.info(`RabbitMQ: not configured (events will not be published)`);
    }

    logger.info(`OpenTelemetry: ${config.OTEL_EXPORTER_OTLP_ENDPOINT ? 'enabled' : 'disabled'}`);
    logger.info(`Swagger docs available at http://localhost:${port}/docs`);
  })
  .catch((error) => {
    logger.error('Failed to connect to database', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await closeRabbitMQ();
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await closeRabbitMQ();
  await disconnectDatabase();
  process.exit(0);
});

export default {
  port,
  fetch: app.fetch,
};
