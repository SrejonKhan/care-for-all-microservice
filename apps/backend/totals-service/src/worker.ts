import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeRabbitMQ, closeRabbitMQ, getRabbitMQ } from './config/rabbitmq';
import { EventHandlerService } from './services/event-handler.service';
import {
  DonationCreatedEvent,
  DonationRefundedEvent,
  PaymentCompletedEvent,
  PaymentRefundedEvent,
} from './types/events.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'totals-service-worker',
  required: {
    database: true,
    rabbitmq: true,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'totals-service-worker',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'totals-service-worker',
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    enabled: config.OTEL_TRACES_ENABLED,
  });
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleDonationCreated(message: unknown): Promise<void> {
  try {
    const event = message as DonationCreatedEvent;
    logger.info('Received donation.created event', {
      eventId: event.eventId,
      campaignId: event.payload.campaignId,
      amount: event.payload.amount,
    });

    await EventHandlerService.handleDonationCreated(event);
  } catch (error) {
    logger.error('Error handling donation.created event', {
      error: (error as Error).message,
    });
    throw error;
  }
}

async function handleDonationRefunded(message: unknown): Promise<void> {
  try {
    const event = message as DonationRefundedEvent;
    logger.info('Received donation.refunded event', {
      eventId: event.eventId,
      campaignId: event.payload.campaignId,
      amount: event.payload.amount,
    });

    await EventHandlerService.handleDonationRefunded(event);
  } catch (error) {
    logger.error('Error handling donation.refunded event', {
      error: (error as Error).message,
    });
    throw error;
  }
}

async function handlePaymentCompleted(message: unknown): Promise<void> {
  try {
    const event = message as PaymentCompletedEvent;
    logger.info('Received payment.completed event', {
      eventId: event.eventId,
      donationId: event.payload.donationId,
      amount: event.payload.amount,
    });

    await EventHandlerService.handlePaymentCompleted(event);
  } catch (error) {
    logger.error('Error handling payment.completed event', {
      error: (error as Error).message,
    });
    throw error;
  }
}

async function handlePaymentRefunded(message: unknown): Promise<void> {
  try {
    const event = message as PaymentRefundedEvent;
    logger.info('Received payment.refunded event', {
      eventId: event.eventId,
      donationId: event.payload.donationId,
      amount: event.payload.amount,
    });

    await EventHandlerService.handlePaymentRefunded(event);
  } catch (error) {
    logger.error('Error handling payment.refunded event', {
      error: (error as Error).message,
    });
    throw error;
  }
}

// ============================================================================
// WORKER STARTUP
// ============================================================================

async function startWorker() {
  try {
    logger.info('Starting totals-service worker...');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Initialize RabbitMQ
    await initializeRabbitMQ();
    logger.info('RabbitMQ initialized');

    // Get RabbitMQ manager
    const rabbitMQ = getRabbitMQ();

    // Subscribe to donation events
    await rabbitMQ.subscribe('donation.created', handleDonationCreated);
    logger.info('Subscribed to donation.created events');

    await rabbitMQ.subscribe('donation.refunded', handleDonationRefunded);
    logger.info('Subscribed to donation.refunded events');

    // Subscribe to payment events (for consistency)
    await rabbitMQ.subscribe('payment.completed', handlePaymentCompleted);
    logger.info('Subscribed to payment.completed events');

    await rabbitMQ.subscribe('payment.refunded', handlePaymentRefunded);
    logger.info('Subscribed to payment.refunded events');

    logger.info('Totals-service worker is running and listening for events');
  } catch (error) {
    logger.error('Failed to start worker', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown() {
  logger.info('Shutting down worker...');

  try {
    // Close RabbitMQ
    await closeRabbitMQ();
    logger.info('RabbitMQ closed');

    // Disconnect database
    await disconnectDatabase();
    logger.info('Database disconnected');

    logger.info('Worker shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason,
    promise,
  });
  shutdown();
});

// ============================================================================
// START
// ============================================================================

startWorker();

