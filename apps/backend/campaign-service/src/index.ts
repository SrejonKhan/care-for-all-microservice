import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { healthRoute } from './routes/health';
import {
  listCampaignsRoute,
  getCampaignRoute,
  createCampaignRoute,
  updateCampaignRoute,
} from './routes/campaigns';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'campaign-service',
  required: {
    database: false, // TODO: Enable when DB is set up
    rabbitmq: false, // TODO: Enable when RabbitMQ is configured
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
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = new OpenAPIHono();

// Health check
app.openapi(healthRoute, (c) => {
  return c.json({
    status: 'healthy',
    service: 'campaign-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Campaign routes
app.openapi(listCampaignsRoute, async (c) => {
  const query = c.req.valid('query');
  
  logger.info('Listing campaigns', query);

  // TODO: Query campaigns from database
  // - Apply filters (status, ownerId)
  // - Implement pagination
  // - Order by creation date

  return c.json({
    success: true,
    data: {
      items: [],
      total: 0,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: 0,
    },
  });
});

app.openapi(getCampaignRoute, async (c) => {
  const { id } = c.req.valid('param');
  
  logger.info('Getting campaign', { id });

  // TODO: Query campaign from database

  return c.json({
    success: true,
    data: {
      id,
      title: 'Mock Campaign',
      description: 'This is a mock campaign',
      goalAmount: 10000,
      currentAmount: 0,
      status: 'ACTIVE',
      ownerId: 'user_123',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
});

app.openapi(createCampaignRoute, async (c) => {
  const body = c.req.valid('json');
  
  logger.info('Creating campaign', { title: body.title });

  // TODO: Insert campaign into database
  // TODO: Publish CampaignCreatedEvent to RabbitMQ

  const campaign = {
    id: 'camp_' + Date.now(),
    ...body,
    currentAmount: 0,
    status: 'DRAFT' as const,
    ownerId: 'user_123', // TODO: Get from auth context
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return c.json(
    {
      success: true,
      data: campaign,
    },
    201
  );
});

app.openapi(updateCampaignRoute, async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  
  logger.info('Updating campaign', { id, updates: body });

  // TODO: Update campaign in database
  // TODO: Publish CampaignUpdatedEvent to RabbitMQ

  return c.json({
    success: true,
    data: {
      id,
      ...body,
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
    title: 'Campaign Service API',
    version: '1.0.0',
    description: 'Campaign management service',
  },
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

logger.info(`Starting campaign-service on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

