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
} from './routes/donations';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'donation-service',
  required: {
    database: false, // TODO: Enable when DB is set up
    rabbitmq: false, // TODO: Enable when RabbitMQ is configured
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

// Health check
app.openapi(healthRoute, (c) => {
  return c.json({
    status: 'healthy',
    service: 'donation-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Donation routes
app.openapi(createPledgeRoute, async (c) => {
  const body = c.req.valid('json');
  
  logger.info('Creating donation', body);

  // TODO: Validate campaign exists
  // TODO: Insert donation into database with state PENDING
  // TODO: Publish DonationCreatedEvent to RabbitMQ
  // TODO: Trigger payment authorization workflow

  const donation = {
    id: 'donation_' + Date.now(),
    ...body,
    userId: 'user_123', // TODO: Get from auth context
    state: PledgeState.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return c.json(
    {
      success: true,
      data: donation,
    },
    201
  );
});

app.openapi(getPledgeRoute, async (c) => {
  const { id } = c.req.valid('param');
  
  logger.info('Getting donation', { id });

  // TODO: Query donation from database

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
  
  logger.info('Transitioning donation state', { id, newState: body.newState });

  // TODO: Validate state transition (PENDING -> AUTHORIZED -> CAPTURED)
  // TODO: Update donation state in database
  // TODO: Publish DonationStateChangedEvent to RabbitMQ

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
    title: 'Donation Service API',
    version: '1.0.0',
    description: 'Donation state machine service',
  },
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

logger.info(`Starting donation-service on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

