import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { healthRoute } from './routes/health';
import { loginRoute, registerRoute } from './routes/auth';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'auth-service',
  required: {
    database: false, // TODO: Enable when DB is set up
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
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = new OpenAPIHono();

// Health check
app.openapi(healthRoute, (c) => {
  return c.json({
    status: 'healthy',
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Auth routes
app.openapi(loginRoute, async (c) => {
  const body = c.req.valid('json');
  
  logger.info('Login attempt', { email: body.email });

  // TODO: Implement actual authentication logic
  // - Query user from database
  // - Verify password hash
  // - Generate JWT token

  return c.json({
    success: true,
    data: {
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: 86400,
    },
  });
});

app.openapi(registerRoute, async (c) => {
  const body = c.req.valid('json');
  
  logger.info('Registration attempt', { email: body.email, name: body.name });

  // TODO: Implement actual registration logic
  // - Check if user exists
  // - Hash password
  // - Store user in database
  // - Generate JWT token

  return c.json(
    {
      success: true,
      data: {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresIn: 86400,
      },
    },
    201
  );
});

// API Documentation
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
    description: 'Authentication and authorization service',
  },
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

logger.info(`Starting auth-service on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

