import { Outbox, OutboxStatus } from '../models/outbox.model';
import { getRabbitMQ } from '../config/rabbitmq';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

const POLL_INTERVAL_MS = 1000; // 1 second
const BATCH_SIZE = 10;

// ============================================================================
// OUTBOX PUBLISHER SERVICE
// ============================================================================

export class OutboxPublisherService {
  private isRunning = false;
  private pollTimeout: Timer | null = null;

  /**
   * Start polling the Outbox for PENDING events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Outbox publisher already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Outbox publisher', {
      pollInterval: POLL_INTERVAL_MS,
      batchSize: BATCH_SIZE,
    });

    await this.poll();
  }

  /**
   * Stop the Outbox publisher
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }

    logger.info('Outbox publisher stopped');
  }

  /**
   * Poll for PENDING events and publish them
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.processPendingEvents();
    } catch (error) {
      logger.error('Error processing outbox events', {
        error: (error as Error).message,
      });
    }

    // Schedule next poll
    this.pollTimeout = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
  }

  /**
   * Process pending events from the Outbox
   */
  private async processPendingEvents(): Promise<void> {
    try {
      // Find PENDING events (oldest first)
      const pendingEvents = await Outbox.find({
        status: OutboxStatus.PENDING,
      })
        .sort({ createdAt: 1 })
        .limit(BATCH_SIZE)
        .exec();

      if (pendingEvents.length === 0) {
        return;
      }

      logger.info('Processing pending outbox events', {
        count: pendingEvents.length,
      });

      // Process each event
      for (const event of pendingEvents) {
        await this.publishEvent(event.id);
      }
    } catch (error) {
      logger.error('Error fetching pending events', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Publish a single event to RabbitMQ
   */
  private async publishEvent(outboxId: string): Promise<void> {
    try {
      const event = await Outbox.findById(outboxId);

      if (!event) {
        logger.warn('Outbox event not found', { outboxId });
        return;
      }

      if (event.status !== OutboxStatus.PENDING) {
        logger.info('Skipping non-pending event', {
          outboxId,
          status: event.status,
        });
        return;
      }

      logger.info('Publishing event to RabbitMQ', {
        eventId: event.eventId,
        eventType: event.eventType,
        routingKey: event.routingKey,
      });

      // Publish to RabbitMQ
      const rabbitMQ = getRabbitMQ();
      await rabbitMQ.publish(event.routingKey, event.payload);

      // Mark as PUBLISHED
      event.status = OutboxStatus.PUBLISHED;
      event.publishedAt = new Date();
      await event.save();

      logger.info('Event published successfully', {
        eventId: event.eventId,
        eventType: event.eventType,
      });

      // Optionally, delete the event after successful publish
      // await event.deleteOne();
    } catch (error) {
      logger.error('Error publishing event', {
        outboxId,
        error: (error as Error).message,
      });

      // Handle retry logic
      await this.handlePublishError(outboxId, (error as Error).message);
    }
  }

  /**
   * Handle publish error with retry logic
   */
  private async handlePublishError(outboxId: string, errorMessage: string): Promise<void> {
    try {
      const event = await Outbox.findById(outboxId);

      if (!event) {
        return;
      }

      event.retryCount += 1;
      event.lastError = errorMessage;

      if (event.retryCount >= event.maxRetries) {
        // Max retries reached, mark as FAILED
        event.status = OutboxStatus.FAILED;
        logger.error('Event publish failed after max retries', {
          eventId: event.eventId,
          retryCount: event.retryCount,
          maxRetries: event.maxRetries,
        });
      } else {
        // Keep as PENDING for retry
        logger.warn('Event publish failed, will retry', {
          eventId: event.eventId,
          retryCount: event.retryCount,
          maxRetries: event.maxRetries,
        });
      }

      await event.save();
    } catch (error) {
      logger.error('Error handling publish error', {
        outboxId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Manually retry failed events (for admin use)
   */
  async retryFailedEvents(): Promise<number> {
    try {
      logger.info('Manually retrying failed events');

      const failedEvents = await Outbox.find({
        status: OutboxStatus.FAILED,
      }).exec();

      logger.info('Found failed events', { count: failedEvents.length });

      let retriedCount = 0;

      for (const event of failedEvents) {
        // Reset status and retry count
        event.status = OutboxStatus.PENDING;
        event.retryCount = 0;
        event.lastError = undefined;
        await event.save();
        retriedCount++;
      }

      logger.info('Failed events reset for retry', { count: retriedCount });

      return retriedCount;
    } catch (error) {
      logger.error('Error retrying failed events', {
        error: (error as Error).message,
      });
      return 0;
    }
  }

  /**
   * Get Outbox statistics
   */
  async getStats(): Promise<{
    pending: number;
    published: number;
    failed: number;
  }> {
    try {
      const [pending, published, failed] = await Promise.all([
        Outbox.countDocuments({ status: OutboxStatus.PENDING }),
        Outbox.countDocuments({ status: OutboxStatus.PUBLISHED }),
        Outbox.countDocuments({ status: OutboxStatus.FAILED }),
      ]);

      return { pending, published, failed };
    } catch (error) {
      logger.error('Error getting outbox stats', {
        error: (error as Error).message,
      });
      return { pending: 0, published: 0, failed: 0 };
    }
  }
}

