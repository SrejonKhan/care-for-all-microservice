import mongoose from 'mongoose';
import { Outbox, OutboxStatus } from '../models/outbox.model';
import {
  PaymentAuthorizedEvent,
  PaymentCapturedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  PAYMENT_EVENT_TYPES,
  PAYMENT_ROUTING_KEYS,
} from '../types/events.types';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'payment-service',
  minLevel: 'info',
});

// ============================================================================
// EVENT SERVICE
// ============================================================================

export class EventService {
  /**
   * Publish payment authorized event
   */
  static async publishPaymentAuthorized(
    event: PaymentAuthorizedEvent,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await Outbox.create(
        [
          {
            eventId,
            eventType: PAYMENT_EVENT_TYPES.AUTHORIZED,
            routingKey: PAYMENT_ROUTING_KEYS.AUTHORIZED,
            payload: event,
            status: OutboxStatus.PENDING,
          },
        ],
        { session }
      );

      logger.info('Payment authorized event added to outbox', {
        eventId,
        paymentId: event.paymentId,
      });
    } catch (error) {
      logger.error('Error publishing payment authorized event', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Publish payment captured event
   */
  static async publishPaymentCaptured(
    event: PaymentCapturedEvent,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await Outbox.create(
        [
          {
            eventId,
            eventType: PAYMENT_EVENT_TYPES.CAPTURED,
            routingKey: PAYMENT_ROUTING_KEYS.CAPTURED,
            payload: event,
            status: OutboxStatus.PENDING,
          },
        ],
        { session }
      );

      logger.info('Payment captured event added to outbox', {
        eventId,
        paymentId: event.paymentId,
      });
    } catch (error) {
      logger.error('Error publishing payment captured event', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Publish payment completed event
   */
  static async publishPaymentCompleted(
    event: PaymentCompletedEvent,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await Outbox.create(
        [
          {
            eventId,
            eventType: PAYMENT_EVENT_TYPES.COMPLETED,
            routingKey: PAYMENT_ROUTING_KEYS.COMPLETED,
            payload: event,
            status: OutboxStatus.PENDING,
          },
        ],
        { session }
      );

      logger.info('Payment completed event added to outbox', {
        eventId,
        paymentId: event.paymentId,
      });
    } catch (error) {
      logger.error('Error publishing payment completed event', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Publish payment failed event
   */
  static async publishPaymentFailed(
    event: PaymentFailedEvent,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await Outbox.create(
        [
          {
            eventId,
            eventType: PAYMENT_EVENT_TYPES.FAILED,
            routingKey: PAYMENT_ROUTING_KEYS.FAILED,
            payload: event,
            status: OutboxStatus.PENDING,
          },
        ],
        { session }
      );

      logger.info('Payment failed event added to outbox', {
        eventId,
        paymentId: event.paymentId,
      });
    } catch (error) {
      logger.error('Error publishing payment failed event', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Publish payment refunded event
   */
  static async publishPaymentRefunded(
    event: PaymentRefundedEvent,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await Outbox.create(
        [
          {
            eventId,
            eventType: PAYMENT_EVENT_TYPES.REFUNDED,
            routingKey: PAYMENT_ROUTING_KEYS.REFUNDED,
            payload: event,
            status: OutboxStatus.PENDING,
          },
        ],
        { session }
      );

      logger.info('Payment refunded event added to outbox', {
        eventId,
        paymentId: event.paymentId,
      });
    } catch (error) {
      logger.error('Error publishing payment refunded event', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

