import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { healthRoute } from './routes/health';
import {
  processPaymentRoute,
  capturePaymentRoute,
  refundPaymentRoute,
  webhookRoute,
} from './routes/payments';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'payment-service',
  required: {
    database: false, // TODO: Enable when DB is set up
    rabbitmq: false, // TODO: Enable when RabbitMQ is configured
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'payment-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'payment-service',
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
    service: 'payment-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Payment routes
app.openapi(processPaymentRoute, async (c) => {
  const body = c.req.valid('json');
  
  logger.info('Processing payment', { pledgeId: body.pledgeId, provider: body.provider });

  // TODO: Check idempotency key in database
  // TODO: Authorize payment with provider (Stripe, PayPal, etc.)
  // TODO: Store payment record with idempotency key
  // TODO: Publish PaymentAuthorizedEvent to RabbitMQ

  return c.json(
    {
      success: true,
      data: {
        id: 'payment_' + Date.now(),
        pledgeId: body.pledgeId,
        amount: 100, // TODO: Get from pledge
        provider: body.provider,
        status: 'AUTHORIZED',
        providerTransactionId: 'txn_mock_' + Date.now(),
      },
    },
    201
  );
});

app.openapi(capturePaymentRoute, async (c) => {
  const { id } = c.req.valid('param');
  
  logger.info('Capturing payment', { id });

  // TODO: Capture payment with provider
  // TODO: Update payment status
  // TODO: Publish PaymentCapturedEvent to RabbitMQ

  return c.json({
    success: true,
    data: {
      id,
      status: 'CAPTURED',
      capturedAt: new Date().toISOString(),
    },
  });
});

app.openapi(refundPaymentRoute, async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  
  logger.info('Refunding payment', { id, reason: body.reason });

  // TODO: Refund payment with provider
  // TODO: Update payment status
  // TODO: Publish PaymentRefundedEvent to RabbitMQ

  return c.json({
    success: true,
    data: {
      id,
      status: 'REFUNDED',
      refundedAt: new Date().toISOString(),
    },
  });
});

app.openapi(webhookRoute, async (c) => {
  const body = c.req.valid('json');
  
  logger.info('Received webhook', { provider: body.provider });

  // TODO: Verify webhook signature
  // TODO: Process webhook event
  // TODO: Update payment status based on webhook
  // TODO: Publish events to RabbitMQ

  return c.json({ success: true });
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
    title: 'Payment Service API',
    version: '1.0.0',
    description: 'Payment processing and webhook handling service',
  },
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

logger.info(`Starting payment-service on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

