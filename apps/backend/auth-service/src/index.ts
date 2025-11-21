import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { healthRoute } from './routes/health';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { connectDatabase, checkDatabaseHealth, disconnectDatabase } from './config/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'auth-service',
  required: {
    database: true,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'auth-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'auth-service',
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
      return c.text('', 204);
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
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Mount auth routes
app.route('/', authRoutes);

// Mount user routes
app.route('/', userRoutes);

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
    title: 'Auth Service API',
    version: '1.0.0',
    description: 'Authentication and authorization service for CareForAll platform',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'http://auth-service:3000',
      description: 'Docker internal',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
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

const port = config.PORT;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// Connect to MongoDB before starting server
connectDatabase()
  .then(() => {
    logger.info(`Starting auth-service on port ${port}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`Database: MongoDB connected`);
    logger.info(`OpenTelemetry: ${config.OTEL_EXPORTER_OTLP_ENDPOINT ? 'enabled' : 'disabled'}`);
  })
  .catch((error) => {
    logger.error('Failed to connect to database', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

export default {
  port,
  fetch: app.fetch,
};
