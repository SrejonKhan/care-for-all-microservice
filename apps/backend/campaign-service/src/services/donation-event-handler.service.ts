import mongoose from 'mongoose';
import { CampaignService } from './campaign.service';
import { EventLog, EventStatus } from '../models/event-log.model';
import { Outbox, OutboxStatus } from '../models/outbox.model';
import {
  DonationCreatedEvent,
  DonationCompletedEvent,
  DonationRefundedEvent,
} from '../types/events.types';
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
// DONATION EVENT HANDLER SERVICE WITH TRANSACTIONAL OUTBOX
// ============================================================================

export class DonationEventHandlerService {
  /**
   * Handle donation.created event using Transactional Outbox pattern
   */
  static async handleDonationCreated(event: DonationCreatedEvent): Promise<void> {
    const { eventId, payload } = event;

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info('Event already processed, skipping', { eventId });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Update campaign current amount
      await mongoose.model('Campaign').findByIdAndUpdate(
        payload.campaignId,
        { $inc: { currentAmount: payload.amount } },
        { session, new: true }
      );

      // 2. Write acknowledgment event to Outbox
      const outboxEventId = this.generateEventId();
      await Outbox.create(
        [
          {
            eventId: outboxEventId,
            eventType: 'campaign.donation_received',
            payload: {
              campaignId: payload.campaignId,
              donationId: payload.donationId,
              amount: payload.amount,
              donorId: payload.donorId,
              timestamp: new Date().toISOString(),
            },
            status: OutboxStatus.PENDING,
          },
        ],
        { session }
      );

      // 3. Mark incoming event as processed
      await EventLog.create(
        [
          {
            eventId,
            eventType: event.eventType,
            payload: event.payload,
            status: EventStatus.PROCESSED,
            processedAt: new Date(),
            retryCount: 0,
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();

      logger.info('Donation created event processed with Outbox', {
        eventId,
        campaignId: payload.campaignId,
        amount: payload.amount,
        outboxEventId,
      });
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      logger.error('Error processing donation created event', {
        eventId,
        error: (error as Error).message,
      });
      await this.markEventFailed(eventId, event, (error as Error).message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle donation.completed event
   * Note: Amount is already counted in donation.created, so this is just for logging
   */
  static async handleDonationCompleted(
    event: DonationCompletedEvent
  ): Promise<void> {
    const { eventId, payload } = event;

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info('Event already processed, skipping', { eventId });
      return;
    }

    try {
      // Just mark as processed - amount already counted
      await this.markEventProcessed(eventId, event);

      logger.info('Donation completed event processed', {
        eventId,
        campaignId: payload.campaignId,
        donationId: payload.donationId,
      });
    } catch (error) {
      logger.error('Error processing donation completed event', {
        eventId,
        error: (error as Error).message,
      });
      await this.markEventFailed(eventId, event, (error as Error).message);
      throw error;
    }
  }

  /**
   * Handle donation.refunded event using Transactional Outbox pattern
   */
  static async handleDonationRefunded(
    event: DonationRefundedEvent
  ): Promise<void> {
    const { eventId, payload } = event;

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info('Event already processed, skipping', { eventId });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Decrease campaign current amount (ensure not negative)
      const campaign = await mongoose.model('Campaign').findById(payload.campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${payload.campaignId}`);
      }

      const newAmount = Math.max(0, (campaign as any).currentAmount - payload.amount);

      await mongoose.model('Campaign').findByIdAndUpdate(
        payload.campaignId,
        { currentAmount: newAmount },
        { session, new: true }
      );

      // 2. Write refund event to Outbox
      const outboxEventId = this.generateEventId();
      await Outbox.create(
        [
          {
            eventId: outboxEventId,
            eventType: 'campaign.donation_refunded',
            payload: {
              campaignId: payload.campaignId,
              donationId: payload.donationId,
              amount: payload.amount,
              reason: payload.reason,
              timestamp: new Date().toISOString(),
            },
            status: OutboxStatus.PENDING,
          },
        ],
        { session }
      );

      // 3. Mark incoming event as processed
      await EventLog.create(
        [
          {
            eventId,
            eventType: event.eventType,
            payload: event.payload,
            status: EventStatus.PROCESSED,
            processedAt: new Date(),
            retryCount: 0,
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();

      logger.info('Donation refunded event processed with Outbox', {
        eventId,
        campaignId: payload.campaignId,
        amount: payload.amount,
        outboxEventId,
      });
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      logger.error('Error processing donation refunded event', {
        eventId,
        error: (error as Error).message,
      });
      await this.markEventFailed(eventId, event, (error as Error).message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Check if event has already been processed (idempotency)
   */
  private static async isEventProcessed(eventId: string): Promise<boolean> {
    const existingLog = await EventLog.findOne({ eventId });
    return existingLog !== null && existingLog.status === EventStatus.PROCESSED;
  }

  /**
   * Mark event as processed
   */
  private static async markEventProcessed(
    eventId: string,
    event: any
  ): Promise<void> {
    await EventLog.findOneAndUpdate(
      { eventId },
      {
        eventId,
        eventType: event.eventType,
        payload: event.payload,
        status: EventStatus.PROCESSED,
        processedAt: new Date(),
        retryCount: 0,
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Mark event as failed
   */
  private static async markEventFailed(
    eventId: string,
    event: any,
    errorMessage: string
  ): Promise<void> {
    await EventLog.findOneAndUpdate(
      { eventId },
      {
        $set: {
          eventId,
          eventType: event.eventType,
          payload: event.payload,
          status: EventStatus.FAILED,
          lastError: errorMessage,
        },
        $inc: { retryCount: 1 },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Generate unique event ID for Outbox
   */
  private static generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}
