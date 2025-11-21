import mongoose from 'mongoose';
import { Outbox, OutboxStatus } from '../models/outbox.model';
import { ROUTING_KEYS } from '../config/rabbitmq';
import {
  DonationCreatedPayload,
  DonationCompletedPayload,
  DonationFailedPayload,
  DonationRefundedPayload,
} from '../types/events.types';
import { createLogger } from '@care-for-all/shared-logger';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

// ============================================================================
// EVENT SERVICE WITH TRANSACTIONAL OUTBOX
// ============================================================================

export class EventService {
  /**
   * Write event to Outbox (within a transaction)
   */
  private static async writeToOutbox(
    eventType: string,
    routingKey: string,
    payload: any,
    session?: mongoose.ClientSession
  ): Promise<void> {
    const eventId = `${eventType}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const event = {
      eventId,
      eventType,
      timestamp: new Date().toISOString(),
      version: '1.0',
      payload,
    };

    await Outbox.create(
      [
        {
          eventId,
          eventType,
          routingKey,
          payload: event,
          status: OutboxStatus.PENDING,
          retryCount: 0,
          maxRetries: 5,
        },
      ],
      { session }
    );

    logger.info('Event written to Outbox', { eventId, eventType });
  }

  /**
   * Publish donation.created event
   */
  static async publishDonationCreated(
    payload: DonationCreatedPayload,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      logger.info('Publishing donation.created event', {
        donationId: payload.donationId,
        campaignId: payload.campaignId,
      });

      await this.writeToOutbox(
        'donation.created',
        ROUTING_KEYS.DONATION_CREATED,
        payload,
        session
      );
    } catch (error) {
      logger.error('Error publishing donation.created event', {
        payload,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Publish donation.completed event
   */
  static async publishDonationCompleted(
    payload: DonationCompletedPayload,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      logger.info('Publishing donation.completed event', {
        donationId: payload.donationId,
        campaignId: payload.campaignId,
      });

      await this.writeToOutbox(
        'donation.completed',
        ROUTING_KEYS.DONATION_COMPLETED,
        payload,
        session
      );
    } catch (error) {
      logger.error('Error publishing donation.completed event', {
        payload,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Publish donation.failed event
   */
  static async publishDonationFailed(
    payload: DonationFailedPayload,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      logger.info('Publishing donation.failed event', {
        donationId: payload.donationId,
        campaignId: payload.campaignId,
      });

      await this.writeToOutbox(
        'donation.failed',
        ROUTING_KEYS.DONATION_FAILED,
        payload,
        session
      );
    } catch (error) {
      logger.error('Error publishing donation.failed event', {
        payload,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Publish donation.refunded event
   */
  static async publishDonationRefunded(
    payload: DonationRefundedPayload,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      logger.info('Publishing donation.refunded event', {
        donationId: payload.donationId,
        campaignId: payload.campaignId,
      });

      await this.writeToOutbox(
        'donation.refunded',
        ROUTING_KEYS.DONATION_REFUNDED,
        payload,
        session
      );
    } catch (error) {
      logger.error('Error publishing donation.refunded event', {
        payload,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

