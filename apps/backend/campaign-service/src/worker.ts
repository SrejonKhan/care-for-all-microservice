import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeRabbitMQ, closeRabbitMQ, QUEUES, ROUTING_KEYS } from './config/rabbitmq';
import { DonationEventHandlerService } from './services/donation-event-handler.service';
import { OutboxPublisherService } from './services/outbox-publisher.service';
import {
  DonationCreatedEvent,
  DonationCompletedEvent,
  DonationRefundedEvent,
} from './types/events.types';
import { createLogger } from '@care-for-all/shared-logger';
import { loadConfig } from '@care-for-all/shared-config';
import { initTracing } from '@care-for-all/shared-otel';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'campaign-service-worker',
  required: {
    database: true,
    rabbitmq: true,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'campaign-service-worker',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'campaign-service-worker',
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    enabled: config.OTEL_TRACES_ENABLED,
  });
  logger.info('OpenTelemetry tracing initialized');
}

// ============================================================================
// OUTBOX PUBLISHER INSTANCE
// ============================================================================

const outboxPublisher = new OutboxPublisherService();

// ============================================================================
// DONATION EVENT HANDLER
// ============================================================================

async function handleDonationEvent(message: unknown): Promise<void> {
  const event = message as any;
  const eventType = event.eventType;
  const eventId = event.eventId;

  logger.info('Processing donation event', {
    eventId,
    eventType,
  });

  try {
    // Route to appropriate handler
    switch (eventType) {
      case 'donation.created':
        await DonationEventHandlerService.handleDonationCreated(
          event as DonationCreatedEvent
        );
        break;

      case 'donation.completed':
        await DonationEventHandlerService.handleDonationCompleted(
          event as DonationCompletedEvent
        );
        break;

      case 'donation.refunded':
        await DonationEventHandlerService.handleDonationRefunded(
          event as DonationRefundedEvent
        );
        break;

      default:
        logger.warn('Unknown event type', { eventType, eventId });
        // Don't throw error for unknown events - just acknowledge
        return;
    }

    logger.info('Donation event processed successfully', {
      eventId,
      eventType,
    });
  } catch (error) {
    logger.error('Error processing donation event', {
      eventId,
      eventType,
      error: (error as Error).message,
    });
    // Re-throw to trigger RabbitMQ nack and redelivery
    throw error;
  }
}

// ============================================================================
// WORKER STARTUP
// ============================================================================

async function startWorker() {
  try {
    logger.info('Starting Campaign Service Worker...');

    // Connect to MongoDB
    await connectDatabase();
    logger.info('Database connected');

    // Initialize RabbitMQ
    const rabbitMQ = await initializeRabbitMQ();
    logger.info('RabbitMQ connected');

    // Setup donation events consumer
    await rabbitMQ.consume(
      QUEUES.DONATION_EVENTS,
      [
        ROUTING_KEYS.DONATION_CREATED,
        ROUTING_KEYS.DONATION_COMPLETED,
        ROUTING_KEYS.DONATION_REFUNDED,
      ],
      handleDonationEvent,
      {
        prefetch: 10, // Process up to 10 messages concurrently
      }
    );

    logger.info('Donation events consumer started', {
      queue: QUEUES.DONATION_EVENTS,
      routingKeys: [
        ROUTING_KEYS.DONATION_CREATED,
        ROUTING_KEYS.DONATION_COMPLETED,
        ROUTING_KEYS.DONATION_REFUNDED,
      ],
    });

    // Start Outbox publisher
    outboxPublisher.start();
    logger.info('Outbox publisher started');

    logger.info('Campaign Service Worker is running');
  } catch (error) {
    logger.error('Failed to start worker', error);
    process.exit(1);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown() {
  logger.info('Shutting down Campaign Service Worker...');

  try {
    // Stop Outbox publisher
    outboxPublisher.stop();
    logger.info('Outbox publisher stopped');

    await closeRabbitMQ();
    logger.info('RabbitMQ connection closed');

    await disconnectDatabase();
    logger.info('Database disconnected');

    logger.info('Worker shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  shutdown();
});

// ============================================================================
// START
// ============================================================================

startWorker();
