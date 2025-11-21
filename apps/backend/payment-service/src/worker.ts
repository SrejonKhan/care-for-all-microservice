import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeRabbitMQ, closeRabbitMQ } from './config/rabbitmq';
import { OutboxPublisherService } from './services/outbox-publisher.service';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'payment-service-worker',
  required: {
    database: true,
    rabbitmq: true,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'payment-service-worker',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'payment-service-worker',
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    enabled: config.OTEL_TRACES_ENABLED,
  });
}

// ============================================================================
// OUTBOX PUBLISHER
// ============================================================================

const outboxPublisher = new OutboxPublisherService();

// ============================================================================
// WORKER STARTUP
// ============================================================================

async function startWorker() {
  try {
    logger.info('Starting payment-service worker...');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Initialize RabbitMQ
    await initializeRabbitMQ();
    logger.info('RabbitMQ initialized');

    // Start outbox publisher
    await outboxPublisher.start();
    logger.info('Outbox publisher started');

    // Log stats periodically
    setInterval(async () => {
      const stats = await outboxPublisher.getStats();
      logger.info('Outbox stats', stats);
    }, 60000); // Every minute

    logger.info('Payment-service worker is running');
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
    // Stop outbox publisher
    await outboxPublisher.stop();
    logger.info('Outbox publisher stopped');

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

