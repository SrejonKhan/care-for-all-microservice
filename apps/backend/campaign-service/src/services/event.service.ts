import { getRabbitMQ } from '../config/rabbitmq';
import { createLogger } from '@care-for-all/shared-logger';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: 'info',
});

// ============================================================================
// EVENT SERVICE
// ============================================================================

export class EventService {
  /**
   * Publish an event with retry logic
   */
  static async publishEvent(
    routingKey: string,
    payload: unknown,
    retries: number = 3
  ): Promise<boolean> {
    const eventId = this.generateEventId();
    const event = {
      eventId,
      eventType: routingKey,
      timestamp: new Date().toISOString(),
      version: '1.0',
      payload,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const rabbitMQ = getRabbitMQ();
        const success = await rabbitMQ.publishEvent(routingKey, event, {
          persistent: true,
          headers: {
            eventId,
            attempt,
          },
        });

        if (success) {
          logger.info('Event published successfully', {
            eventId,
            routingKey,
            attempt,
          });
          return true;
        }
      } catch (error) {
        lastError = error as Error;
        logger.warn('Event publish attempt failed', {
          eventId,
          routingKey,
          attempt,
          error: (error as Error).message,
        });

        // Exponential backoff
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await this.sleep(delay);
        }
      }
    }

    logger.error('Event publish failed after all retries', {
      eventId,
      routingKey,
      retries,
      error: lastError?.message,
    });

    return false;
  }

  /**
   * Generate unique event ID
   */
  private static generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Sleep helper for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

