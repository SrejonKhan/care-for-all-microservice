import { Outbox, OutboxStatus } from '../models/outbox.model';
import { getRabbitMQ } from '../config/rabbitmq';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service-outbox',
  minLevel: 'info',
});

const OUTBOX_POLL_INTERVAL = parseInt(process.env.OUTBOX_POLL_INTERVAL || '1000', 10);
const OUTBOX_MAX_RETRIES = parseInt(process.env.OUTBOX_MAX_RETRIES || '5', 10);
const OUTBOX_BATCH_SIZE = parseInt(process.env.OUTBOX_BATCH_SIZE || '10', 10);

// ============================================================================
// OUTBOX PUBLISHER SERVICE
// ============================================================================

export class OutboxPublisherService {
  private pollingInterval: Timer | null = null;
  private isRunning = false;

  /**
   * Start polling the Outbox for PENDING events
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Outbox publisher already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Outbox publisher', {
      pollInterval: OUTBOX_POLL_INTERVAL,
      maxRetries: OUTBOX_MAX_RETRIES,
      batchSize: OUTBOX_BATCH_SIZE,
    });

    // Start polling loop
    this.pollingInterval = setInterval(() => {
      this.poll().catch((error) => {
        logger.error('Error in Outbox polling loop', error);
      });
    }, OUTBOX_POLL_INTERVAL);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isRunning = false;
    logger.info('Stopped Outbox publisher');
  }

  /**
   * Poll for PENDING events and publish them
   */
  private async poll(): Promise<void> {
    try {
      // Get PENDING events (oldest first, limit batch size)
      const events = await Outbox.find({ status: OutboxStatus.PENDING })
        .sort({ createdAt: 1 })
        .limit(OUTBOX_BATCH_SIZE)
        .exec();

      if (events.length === 0) {
        return; // No events to process
      }

      logger.debug('Processing Outbox events', { count: events.length });

      // Process each event
      for (const event of events) {
        await this.publishEvent(event);
      }

      logger.info('Outbox polling complete', {
        processed: events.length,
      });
    } catch (error) {
      logger.error('Error polling Outbox', error);
      throw error;
    }
  }

  /**
   * Publish a single event from the Outbox
   */
  private async publishEvent(event: any): Promise<void> {
    const eventId = event.eventId;
    const eventType = event.eventType;

    try {
      // Get RabbitMQ instance
      const rabbitMQ = getRabbitMQ();

      // Publish event to RabbitMQ
      const success = await rabbitMQ.publishEvent(eventType, event.payload, {
        persistent: true,
        headers: {
          eventId,
          source: 'outbox',
        },
      });

      if (!success) {
        throw new Error('Failed to publish event to RabbitMQ');
      }

      // Mark as PUBLISHED
      await Outbox.findByIdAndUpdate(event._id, {
        status: OutboxStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      logger.info('Outbox event published successfully', {
        eventId,
        eventType,
        retryCount: event.retryCount,
      });
    } catch (error) {
      // Increment retry count
      const retryCount = event.retryCount + 1;
      const errorMessage = (error as Error).message;

      logger.error('Failed to publish Outbox event', {
        eventId,
        eventType,
        retryCount,
        error: errorMessage,
      });

      if (retryCount >= OUTBOX_MAX_RETRIES) {
        // Mark as FAILED after max retries
        await Outbox.findByIdAndUpdate(event._id, {
          status: OutboxStatus.FAILED,
          retryCount,
          lastError: errorMessage,
        });

        logger.error('Outbox event marked as FAILED after max retries', {
          eventId,
          eventType,
          retryCount,
          maxRetries: OUTBOX_MAX_RETRIES,
        });
      } else {
        // Update retry count and error
        await Outbox.findByIdAndUpdate(event._id, {
          retryCount,
          lastError: errorMessage,
        });

        logger.warn('Outbox event will be retried', {
          eventId,
          eventType,
          retryCount,
          maxRetries: OUTBOX_MAX_RETRIES,
        });
      }
    }
  }

  /**
   * Manually retry a FAILED event (for admin operations)
   */
  static async retryFailedEvent(eventId: string): Promise<boolean> {
    try {
      const event = await Outbox.findOne({ eventId, status: OutboxStatus.FAILED });

      if (!event) {
        logger.warn('Failed event not found for retry', { eventId });
        return false;
      }

      // Reset status to PENDING and retry count to 0
      await Outbox.findByIdAndUpdate(event._id, {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        $unset: { lastError: '' },
      });

      logger.info('Failed event reset for retry', { eventId });
      return true;
    } catch (error) {
      logger.error('Error retrying failed event', { eventId, error });
      return false;
    }
  }

  /**
   * Get Outbox statistics
   */
  static async getStatistics(): Promise<{
    pending: number;
    published: number;
    failed: number;
    total: number;
  }> {
    const [pending, published, failed, total] = await Promise.all([
      Outbox.countDocuments({ status: OutboxStatus.PENDING }),
      Outbox.countDocuments({ status: OutboxStatus.PUBLISHED }),
      Outbox.countDocuments({ status: OutboxStatus.FAILED }),
      Outbox.countDocuments({}),
    ]);

    return { pending, published, failed, total };
  }
}

