import mongoose from 'mongoose';
import { EventLog, EventStatus } from '../models/event-log.model';
import { TotalsService } from './totals.service';
import {
  DonationCreatedEvent,
  DonationRefundedEvent,
  PaymentCompletedEvent,
  PaymentRefundedEvent,
  TotalsEvent,
} from '../types/events.types';
import { createLogger } from '@care-for-all/shared-logger';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'totals-service',
  minLevel: 'info',
});

// Track unique donors per campaign
const campaignDonors = new Map<string, Set<string>>();

// ============================================================================
// EVENT HANDLER SERVICE
// ============================================================================

export class EventHandlerService {
  /**
   * Check if event has been processed (idempotency)
   */
  static async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const existing = await EventLog.findOne({ eventId });
      return existing !== null && existing.status === EventStatus.PROCESSED;
    } catch (error) {
      logger.error('Error checking event idempotency', {
        eventId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Mark event as processed
   */
  static async markEventProcessed(
    eventId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    try {
      await EventLog.findOneAndUpdate(
        { eventId },
        {
          eventId,
          eventType,
          payload,
          status: EventStatus.PROCESSED,
          processedAt: new Date(),
          retryCount: 0,
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error marking event as processed', {
        eventId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Mark event as failed
   */
  static async markEventFailed(
    eventId: string,
    eventType: string,
    payload: any,
    errorMessage: string
  ): Promise<void> {
    try {
      const existing = await EventLog.findOne({ eventId });
      const retryCount = existing ? existing.retryCount + 1 : 1;

      await EventLog.findOneAndUpdate(
        { eventId },
        {
          eventId,
          eventType,
          payload,
          status: EventStatus.FAILED,
          processedAt: new Date(),
          errorMessage,
          retryCount,
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error marking event as failed', {
        eventId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Generate event ID from payload (fallback)
   */
  static generateEventId(prefix: string = 'evt'): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Handle donation.created event
   */
  static async handleDonationCreated(event: DonationCreatedEvent): Promise<void> {
    const { eventId, payload } = event;
    const { campaignId, amount, donorId, isGuest } = payload;

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info('Event already processed, skipping', { eventId });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Determine if this is a new donor
      let isNewDonor = false;
      if (donorId && !isGuest) {
        if (!campaignDonors.has(campaignId)) {
          campaignDonors.set(campaignId, new Set());
        }
        const donors = campaignDonors.get(campaignId)!;
        if (!donors.has(donorId)) {
          donors.add(donorId);
          isNewDonor = true;
        }
      }

      // Increment totals
      await TotalsService.incrementTotals(
        campaignId,
        amount,
        true, // increment pledges
        isNewDonor // increment donors only if new
      );

      // Mark event as processed
      await EventLog.create(
        [
          {
            eventId,
            eventType: event.eventType,
            payload,
            status: EventStatus.PROCESSED,
            processedAt: new Date(),
            retryCount: 0,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.info('Donation created event processed', {
        eventId,
        campaignId,
        amount,
        isNewDonor,
      });
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error processing donation created event', {
        eventId,
        error: (error as Error).message,
      });
      await this.markEventFailed(eventId, event.eventType, payload, (error as Error).message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle donation.refunded event
   */
  static async handleDonationRefunded(event: DonationRefundedEvent): Promise<void> {
    const { eventId, payload } = event;
    const { campaignId, amount } = payload;

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info('Event already processed, skipping', { eventId });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Decrement totals
      await TotalsService.decrementTotals(campaignId, amount, true);

      // Mark event as processed
      await EventLog.create(
        [
          {
            eventId,
            eventType: event.eventType,
            payload,
            status: EventStatus.PROCESSED,
            processedAt: new Date(),
            retryCount: 0,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.info('Donation refunded event processed', {
        eventId,
        campaignId,
        amount,
      });
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error processing donation refunded event', {
        eventId,
        error: (error as Error).message,
      });
      await this.markEventFailed(eventId, event.eventType, payload, (error as Error).message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle payment.completed event (backup/consistency check)
   */
  static async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const { eventId, payload } = event;
    const { donationId, amount } = payload;

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info('Event already processed, skipping', { eventId });
      return;
    }

    // Note: We need campaignId from donation, but payment events don't have it
    // This is a backup event - donation.created should have already updated totals
    // We'll just log it for consistency tracking

    try {
      await EventLog.create({
        eventId,
        eventType: event.eventType,
        payload,
        status: EventStatus.PROCESSED,
        processedAt: new Date(),
        retryCount: 0,
      });

      logger.info('Payment completed event processed (logged only)', {
        eventId,
        donationId,
        amount,
      });
    } catch (error) {
      logger.error('Error processing payment completed event', {
        eventId,
        error: (error as Error).message,
      });
      await this.markEventFailed(eventId, event.eventType, payload, (error as Error).message);
      throw error;
    }
  }

  /**
   * Handle payment.refunded event
   */
  static async handlePaymentRefunded(event: PaymentRefundedEvent): Promise<void> {
    const { eventId, payload } = event;
    const { donationId, amount } = payload;

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info('Event already processed, skipping', { eventId });
      return;
    }

    // Note: Similar to payment.completed, we need campaignId
    // This should be handled by donation.refunded event instead
    // We'll just log it for consistency tracking

    try {
      await EventLog.create({
        eventId,
        eventType: event.eventType,
        payload,
        status: EventStatus.PROCESSED,
        processedAt: new Date(),
        retryCount: 0,
      });

      logger.info('Payment refunded event processed (logged only)', {
        eventId,
        donationId,
        amount,
      });
    } catch (error) {
      logger.error('Error processing payment refunded event', {
        eventId,
        error: (error as Error).message,
      });
      await this.markEventFailed(eventId, event.eventType, payload, (error as Error).message);
      throw error;
    }
  }

  /**
   * Process any totals event
   */
  static async processEvent(event: TotalsEvent): Promise<void> {
    try {
      switch (event.eventType) {
        case 'donation.created':
          await this.handleDonationCreated(event as DonationCreatedEvent);
          break;
        case 'donation.refunded':
          await this.handleDonationRefunded(event as DonationRefundedEvent);
          break;
        case 'payment.completed':
          await this.handlePaymentCompleted(event as PaymentCompletedEvent);
          break;
        case 'payment.refunded':
          await this.handlePaymentRefunded(event as PaymentRefundedEvent);
          break;
        default:
          logger.warn('Unknown event type', { eventType: event.eventType });
      }
    } catch (error) {
      logger.error('Error processing event', {
        eventId: event.eventId,
        eventType: event.eventType,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

