import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { healthRoute } from './routes/health';
import { proxyMiddleware } from './middleware/proxy';
import { loggingMiddleware } from './middleware/logging';
import { errorHandler } from './middleware/error';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'gateway',
  required: {
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'gateway',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'gateway',
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    enabled: config.OTEL_TRACES_ENABLED,
  });
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = new OpenAPIHono();

// CORS middleware - Allow frontend access
app.use('*', async (c, next) => {
  // Set CORS headers
  c.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  c.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  
  await next();
});

// Middleware
app.use('*', loggingMiddleware(logger));
app.onError(errorHandler(logger));

// Health check
app.openapi(healthRoute, (c) => {
  return c.json({
    status: 'healthy',
    service: 'gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
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

// OpenAPI spec endpoint
app.doc('/openapi', {
  openapi: '3.1.0',
  info: {
    title: 'Care For All - API Gateway',
    version: '1.0.0',
    description: 'API Gateway for the Care For All donation platform',
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Local development',
    },
  ],
});

// ============================================================================
// PROXY ROUTES TO MICROSERVICES
// ============================================================================

// Proxy to auth-service
app.all('/api/auth/*', proxyMiddleware(config.AUTH_SERVICE_URL, '/api/auth', logger));

// Proxy to campaign-service
app.all('/api/campaigns/*', proxyMiddleware(config.CAMPAIGN_SERVICE_URL, '/api/campaigns', logger));

// Proxy to donation-service
app.all('/api/donations/*', proxyMiddleware(config.DONATION_SERVICE_URL, '/api/donations', logger));

// Proxy to payment-service
app.all('/api/payments/*', proxyMiddleware(config.PAYMENT_SERVICE_URL, '/api/payments', logger));

// Proxy to totals-service
app.all('/api/totals/*', proxyMiddleware(config.TOTALS_SERVICE_URL, '/api/totals', logger));

// Proxy to chat-service
app.all('/api/chat/*', proxyMiddleware(config.CHAT_SERVICE_URL, '/api/chat', logger));

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Care For All API Gateway',
    version: '1.0.0',
    docs: '/docs',
    health: '/health',
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

logger.info(`Starting gateway on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

