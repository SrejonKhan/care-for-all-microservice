import { RabbitMQManager } from '@care-for-all/shared-rabbitmq';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'payment-service',
  required: {
    database: false,
    rabbitmq: true,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'payment-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// ============================================================================
// RABBITMQ MANAGER
// ============================================================================

let rabbitMQManager: RabbitMQManager | null = null;

/**
 * Initialize RabbitMQ connection and setup exchanges
 */
export async function initializeRabbitMQ(): Promise<void> {
  try {
    logger.info('Initializing RabbitMQ...');

    rabbitMQManager = new RabbitMQManager(
      config.RABBITMQ_URL!,
      config.RABBITMQ_EXCHANGE || 'care-for-all'
    );

    await rabbitMQManager.connect();

    logger.info('RabbitMQ initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize RabbitMQ', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Get RabbitMQ manager instance
 */
export function getRabbitMQ(): RabbitMQManager {
  if (!rabbitMQManager) {
    throw new Error('RabbitMQ not initialized. Call initializeRabbitMQ() first.');
  }
  return rabbitMQManager;
}

/**
 * Close RabbitMQ connection
 */
export async function closeRabbitMQ(): Promise<void> {
  if (rabbitMQManager) {
    try {
      await rabbitMQManager.close();
      rabbitMQManager = null;
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

/**
 * Check RabbitMQ health
 */
export function checkRabbitMQHealth(): {
  healthy: boolean;
  message: string;
} {
  if (!rabbitMQManager) {
    return {
      healthy: false,
      message: 'RabbitMQ not initialized',
    };
  }

  // TODO: Implement proper health check in RabbitMQManager
  return {
    healthy: true,
    message: 'RabbitMQ is connected',
  };
}

