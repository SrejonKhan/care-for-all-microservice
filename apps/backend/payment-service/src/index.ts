import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { connectDatabase, checkDatabaseHealth } from './config/database';
import { initializeRabbitMQ } from './config/rabbitmq';

// Routes
import { healthRoute } from './routes/health';
import {
  authorizePaymentRoute,
  capturePaymentRoute,
  refundPaymentRoute,
  getPaymentRoute,
  listPaymentsRoute,
} from './routes/payments';
import { webhookRoute } from './routes/webhooks';

// Services
import { PaymentService } from './services/payment.service';
import { IdempotencyService } from './services/idempotency.service';
import { WebhookService } from './services/webhook.service';
import { EventService } from './services/event.service';

// Middleware
import { requireAuth } from './middleware/auth';

// Models
import { PaymentStatus, WebhookStatus, WebhookProvider } from './models';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'payment-service',
  required: {
    database: true,
    rabbitmq: true,
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

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.openapi(healthRoute, async (c) => {
  const dbHealth = await checkDatabaseHealth();

  return c.json({
    status: dbHealth.healthy ? 'healthy' : 'degraded',
    service: 'payment-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
  });
});

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

// Authorize Payment
app.openapi(authorizePaymentRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    logger.info('Authorizing payment', {
      donationId: body.donationId,
      amount: body.amount,
      provider: body.provider,
      idempotencyKey: body.idempotencyKey,
    });

    // Check idempotency
    const existingResponse = await IdempotencyService.checkKey(body.idempotencyKey);
    if (existingResponse.exists) {
      logger.info('Returning cached response for idempotent request', {
        idempotencyKey: body.idempotencyKey,
      });
      return c.json(existingResponse.response, 409 as any);
    }

    // Create payment in PENDING state
    const payment = await PaymentService.createPayment({
      donationId: body.donationId,
      amount: body.amount,
      provider: body.provider,
      idempotencyKey: body.idempotencyKey,
      paymentMethodId: body.paymentMethodId,
      metadata: body.metadata,
    });

    // Authorize with provider
    const authorizedPayment = await PaymentService.authorizePayment(payment.paymentId);

    // Publish event if authorized
    if (authorizedPayment.status === PaymentStatus.AUTHORIZED) {
      await EventService.publishPaymentAuthorized({
        paymentId: authorizedPayment.paymentId,
        donationId: authorizedPayment.donationId,
        amount: authorizedPayment.amount,
        provider: authorizedPayment.provider,
        providerTransactionId: authorizedPayment.providerTransactionId!,
        timestamp: new Date().toISOString(),
        metadata: authorizedPayment.metadata,
      });
    } else if (authorizedPayment.status === PaymentStatus.FAILED) {
      await EventService.publishPaymentFailed({
        paymentId: authorizedPayment.paymentId,
        donationId: authorizedPayment.donationId,
        amount: authorizedPayment.amount,
        provider: authorizedPayment.provider,
        reason: authorizedPayment.failureReason || 'Authorization failed',
        timestamp: new Date().toISOString(),
        metadata: authorizedPayment.metadata,
      });
    }

    const response = {
      success: true,
      data: authorizedPayment.toJSON(),
    };

    // Store for idempotency
    await IdempotencyService.storeResponse(body.idempotencyKey, response);

    return c.json(response, 201 as any);
  } catch (error) {
    logger.error('Error authorizing payment', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'PAYMENT_AUTHORIZATION_ERROR',
          message: (error as Error).message,
        },
      },
      500 as any
    );
  }
});

// Capture Payment
app.openapi(capturePaymentRoute, async (c) => {
  try {
    const { paymentId } = c.req.valid('param');
    const body = c.req.valid('json');

    logger.info('Capturing payment', { paymentId, amount: body?.amount });

    const payment = await PaymentService.capturePayment(paymentId, body?.amount);

    // Publish event if captured
    if (payment.status === PaymentStatus.CAPTURED) {
      await EventService.publishPaymentCaptured({
        paymentId: payment.paymentId,
        donationId: payment.donationId,
        amount: payment.amount,
        provider: payment.provider,
        providerTransactionId: payment.providerTransactionId!,
        timestamp: new Date().toISOString(),
        metadata: payment.metadata,
      });

      // Auto-complete the payment
      const completedPayment = await PaymentService.completePayment(paymentId);

      await EventService.publishPaymentCompleted({
        paymentId: completedPayment.paymentId,
        donationId: completedPayment.donationId,
        amount: completedPayment.amount,
        provider: completedPayment.provider,
        providerTransactionId: completedPayment.providerTransactionId!,
        timestamp: new Date().toISOString(),
        metadata: completedPayment.metadata,
      });

      return c.json({
        success: true,
        data: completedPayment.toJSON(),
      });
    } else if (payment.status === PaymentStatus.FAILED) {
      await EventService.publishPaymentFailed({
        paymentId: payment.paymentId,
        donationId: payment.donationId,
        amount: payment.amount,
        provider: payment.provider,
        reason: payment.failureReason || 'Capture failed',
        timestamp: new Date().toISOString(),
        metadata: payment.metadata,
      });
    }

    return c.json({
      success: true,
      data: payment.toJSON(),
    });
  } catch (error) {
    logger.error('Error capturing payment', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'PAYMENT_CAPTURE_ERROR',
          message: (error as Error).message,
        },
      },
      500 as any
    );
  }
});

// Refund Payment
app.openapi(refundPaymentRoute, async (c) => {
  try {
    const { paymentId } = c.req.valid('param');
    const body = c.req.valid('json');

    logger.info('Refunding payment', {
      paymentId,
      amount: body.amount,
      reason: body.reason,
    });

    const payment = await PaymentService.refundPayment(
      paymentId,
      body.reason,
      body.amount
    );

    // Publish refund event
    await EventService.publishPaymentRefunded({
      paymentId: payment.paymentId,
      donationId: payment.donationId,
      amount: payment.amount,
      provider: payment.provider,
      reason: payment.refundReason!,
      refundId: payment.metadata?.refundId,
      timestamp: new Date().toISOString(),
      metadata: payment.metadata,
    });

    return c.json({
      success: true,
      data: payment.toJSON(),
    });
  } catch (error) {
    logger.error('Error refunding payment', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'PAYMENT_REFUND_ERROR',
          message: (error as Error).message,
        },
      },
      500 as any
    );
  }
});

// Get Payment
app.openapi(getPaymentRoute, async (c) => {
  try {
    const { paymentId } = c.req.valid('param');

    const payment = await PaymentService.getPayment(paymentId);

    if (!payment) {
      return c.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: `Payment not found: ${paymentId}`,
          },
        },
        404 as any
      );
    }

    return c.json({
      success: true,
      data: payment.toJSON(),
    });
  } catch (error) {
    logger.error('Error getting payment', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'PAYMENT_RETRIEVAL_ERROR',
          message: (error as Error).message,
        },
      },
      500 as any
    );
  }
});

// List Payments
app.openapi(listPaymentsRoute, async (c) => {
  try {
    const query = c.req.valid('query');

    const { payments, total } = await PaymentService.listPayments({
      donationId: query.donationId,
      provider: query.provider as any,
      status: query.status as any,
      limit: query.limit,
      offset: query.offset,
    });

    return c.json({
      success: true,
      data: {
        payments: payments.map((p) => p.toJSON()),
        total,
        limit: query.limit || 20,
        offset: query.offset || 0,
      },
    });
  } catch (error) {
    logger.error('Error listing payments', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'PAYMENT_LIST_ERROR',
          message: (error as Error).message,
        },
      },
      500 as any
    );
  }
});

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

app.openapi(webhookRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    logger.info('Received webhook', {
      provider: body.provider,
      eventType: body.eventType,
      eventId: body.eventId,
    });

    // Check if webhook already processed (idempotency)
    const isProcessed = await WebhookService.isWebhookProcessed(body.eventId);
    if (isProcessed) {
      logger.info('Webhook already processed', { eventId: body.eventId });
      return c.json({
        success: true,
        message: 'Webhook already processed',
      }, 409 as any);
    }

    // Verify signature if provided
    if (body.signature) {
      const isValid = await WebhookService.verifySignature({
        provider: body.provider as WebhookProvider,
        payload: JSON.stringify(body.data),
        signature: body.signature,
      });

      if (!isValid) {
        logger.warn('Invalid webhook signature', { eventId: body.eventId });
        await WebhookService.logWebhook({
          provider: body.provider as WebhookProvider,
          eventType: body.eventType,
          eventId: body.eventId,
          status: WebhookStatus.FAILED,
          signature: body.signature,
          payload: body.data,
          errorMessage: 'Invalid signature',
        });

        return c.json(
          {
            success: false,
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Invalid webhook signature',
            },
          },
          400 as any
        );
      }
    }

    // Process webhook based on event type
    // This is a simplified implementation - extend based on provider
    const paymentId = body.data.paymentId || body.data.payment_id;

    await WebhookService.logWebhook({
      provider: body.provider as WebhookProvider,
      eventType: body.eventType,
      eventId: body.eventId,
      paymentId,
      status: WebhookStatus.PROCESSED,
      signature: body.signature,
      payload: body.data,
    });

    return c.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error('Error processing webhook', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: (error as Error).message,
        },
      },
      500 as any
    );
  }
});

// ============================================================================
// API DOCUMENTATION
// ============================================================================

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
    description: 'Payment processing service with idempotency, state machine, and webhook handling',
  },
  servers: [
    {
      url: 'http://localhost:3004',
      description: 'Development server',
    },
  ],
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.onError((err, c) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500 as any
  );
});

// ============================================================================
// STARTUP
// ============================================================================

async function startServer() {
  try {
    logger.info('Starting payment-service...');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Initialize RabbitMQ
    await initializeRabbitMQ();
    logger.info('RabbitMQ initialized');

    const port = config.PORT;
    logger.info(`Payment-service running on port ${port}`);
    logger.info(`API Documentation: http://localhost:${port}/docs`);
  } catch (error) {
    logger.error('Failed to start server', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// Start server
startServer();

// ============================================================================
// EXPORT
// ============================================================================

export default {
  port: config.PORT,
  fetch: app.fetch,
};
