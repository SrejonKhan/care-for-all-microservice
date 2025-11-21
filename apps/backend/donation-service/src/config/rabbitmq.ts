import { RabbitMQManager, createRabbitMQManager } from '@care-for-all/shared-rabbitmq';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

// ============================================================================
// RABBITMQ MANAGER
// ============================================================================

let rabbitMQManager: RabbitMQManager | null = null;

export async function initializeRabbitMQ(): Promise<RabbitMQManager> {
  if (rabbitMQManager) {
    return rabbitMQManager;
  }

  const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  const exchange = process.env.RABBITMQ_EXCHANGE || 'care-for-all';

  try {
    rabbitMQManager = createRabbitMQManager({
      url: rabbitMQUrl,
      exchange,
      queuePrefix: 'donation-service',
      retryAttempts: 5,
      retryDelay: 5000,
    });

    await rabbitMQManager.connect();
    logger.info('RabbitMQ initialized successfully');

    return rabbitMQManager;
  } catch (error) {
    logger.error('Failed to initialize RabbitMQ', error);
    throw error;
  }
}

export function getRabbitMQ(): RabbitMQManager {
  if (!rabbitMQManager) {
    throw new Error('RabbitMQ not initialized. Call initializeRabbitMQ() first.');
  }
  return rabbitMQManager;
}

export async function closeRabbitMQ(): Promise<void> {
  if (rabbitMQManager) {
    await rabbitMQManager.close();
    rabbitMQManager = null;
    logger.info('RabbitMQ connection closed');
  }
}

// ============================================================================
// ROUTING KEYS
// ============================================================================

export const ROUTING_KEYS = {
  // Donation events (published)
  DONATION_CREATED: 'donation.created',
  DONATION_COMPLETED: 'donation.completed',
  DONATION_FAILED: 'donation.failed',
  DONATION_REFUNDED: 'donation.refunded',
} as const;

