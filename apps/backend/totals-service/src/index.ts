import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { healthRoute } from './routes/health';
import { getCampaignTotalsRoute } from './routes/totals';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'totals-service',
  required: {
    database: false, // TODO: Enable when DB is set up
    rabbitmq: false, // TODO: Enable when RabbitMQ is configured
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'totals-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'totals-service',
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
    service: 'totals-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Totals routes
app.openapi(getCampaignTotalsRoute, async (c) => {
  const { campaignId } = c.req.valid('param');
  
  logger.info('Getting campaign totals', { campaignId });

  // TODO: Query materialized view from database
  // This view should be updated via RabbitMQ events:
  // - PaymentCapturedEvent -> increment total
  // - PaymentRefundedEvent -> decrement total

  return c.json({
    success: true,
    data: {
      campaignId,
      totalAmount: 0,
      totalPledges: 0,
      totalDonors: 0,
      lastUpdated: new Date().toISOString(),
    },
  });
});

// TODO: Add RabbitMQ consumer to listen for payment events
// setupEventConsumer();

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
    title: 'Totals Service API',
    version: '1.0.0',
    description: 'Materialized read model for campaign totals',
  },
});

// ============================================================================
// EVENT CONSUMERS
// ============================================================================

async function setupEventConsumer() {
  // TODO: Initialize RabbitMQ connection
  // TODO: Subscribe to payment.captured events
  // TODO: Subscribe to payment.refunded events
  // TODO: Update totals in database when events are received
  
  logger.info('Event consumer setup (TODO)');
}

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

logger.info(`Starting totals-service on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

