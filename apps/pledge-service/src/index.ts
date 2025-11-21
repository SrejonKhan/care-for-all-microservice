import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { PledgeState } from '@care-for-all/shared-types';
import { healthRoute } from './routes/health';
import {
  createPledgeRoute,
  getPledgeRoute,
  transitionPledgeStateRoute,
} from './routes/pledges';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'pledge-service',
  required: {
    database: false, // TODO: Enable when DB is set up
    rabbitmq: false, // TODO: Enable when RabbitMQ is configured
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'pledge-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'pledge-service',
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
    service: 'pledge-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Pledge routes
app.openapi(createPledgeRoute, async (c) => {
  const body = c.req.valid('json');
  
  logger.info('Creating pledge', body);

  // TODO: Validate campaign exists
  // TODO: Insert pledge into database with state PENDING
  // TODO: Publish PledgeCreatedEvent to RabbitMQ
  // TODO: Trigger payment authorization workflow

  const pledge = {
    id: 'pledge_' + Date.now(),
    ...body,
    userId: 'user_123', // TODO: Get from auth context
    state: PledgeState.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return c.json(
    {
      success: true,
      data: pledge,
    },
    201
  );
});

app.openapi(getPledgeRoute, async (c) => {
  const { id } = c.req.valid('param');
  
  logger.info('Getting pledge', { id });

  // TODO: Query pledge from database

  return c.json({
    success: true,
    data: {
      id,
      campaignId: 'camp_123',
      userId: 'user_123',
      amount: 100,
      state: PledgeState.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
});

app.openapi(transitionPledgeStateRoute, async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  
  logger.info('Transitioning pledge state', { id, newState: body.newState });

  // TODO: Validate state transition (PENDING -> AUTHORIZED -> CAPTURED)
  // TODO: Update pledge state in database
  // TODO: Publish PledgeStateChangedEvent to RabbitMQ

  return c.json({
    success: true,
    data: {
      id,
      previousState: PledgeState.PENDING,
      newState: body.newState,
      updatedAt: new Date().toISOString(),
    },
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

// OpenAPI spec
app.doc('/openapi', {
  openapi: '3.1.0',
  info: {
    title: 'Pledge Service API',
    version: '1.0.0',
    description: 'Pledge state machine service',
  },
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

logger.info(`Starting pledge-service on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

