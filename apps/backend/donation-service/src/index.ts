import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { connectDatabase } from './config/database';
import { initializeRabbitMQ } from './config/rabbitmq';
import { healthRouter } from './routes/health';
import { donationsRouter } from './routes/donations';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'donation-service',
  required: {
    database: true,
    rabbitmq: true,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'donation-service',
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    enabled: config.OTEL_TRACES_ENABLED,
  });
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = new OpenAPIHono();

// CORS middleware (development only)
if (config.NODE_ENV === 'development') {
  app.use('/*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (c.req.method === 'OPTIONS') {
      return new Response('', { status: 204 });
    }

    await next();
  });
}

// Request logging middleware
app.use('/*', async (c, next) => {
  const start = Date.now();
  const { method, url } = c.req;

  logger.info('Incoming request', { method, url });

  await next();

  const duration = Date.now() - start;
  logger.info('Request completed', {
    method,
    url,
    status: c.res.status,
    duration: `${duration}ms`,
  });
});

// ============================================================================
// ROUTES
// ============================================================================

// Mount health router
app.route('/', healthRouter);

// Mount donations router
app.route('/api', donationsRouter);

// API Documentation (Scalar UI)
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
    title: 'Donation Service API',
    version: '1.0.0',
    description:
      'Donation service for the CareForAll platform with checkout and bank balance verification',
  },
  servers: [
    {
      url: 'http://localhost:3003',
      description: 'Local development',
    },
  ],
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'donation-service',
    version: '1.0.0',
    status: 'running',
    docs: '/docs',
    openapi: '/openapi',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    },
    404
  );
});

// Error handler
app.onError((error, c) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
  });

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: config.NODE_ENV === 'development' ? error.message : 'Internal server error',
      },
    },
    500
  );
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Initialize RabbitMQ
    await initializeRabbitMQ();
    logger.info('RabbitMQ initialized');

    // Start server
    logger.info(`Starting donation-service on port ${port}`);
    logger.info(`API docs available at http://localhost:${port}/docs`);
  } catch (error) {
    logger.error('Failed to start server', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

startServer();

export default {
  port,
  fetch: app.fetch,
};
