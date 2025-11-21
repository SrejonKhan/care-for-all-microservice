import * as crypto from 'crypto';
import { WebhookLog, WebhookStatus, WebhookProvider } from '../models/webhook-log.model';
import { PaymentProviderFactory } from './payment-provider.service';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'payment-service',
  minLevel: 'info',
});

// ============================================================================
// WEBHOOK SERVICE
// ============================================================================

export class WebhookService {
  /**
   * Check if webhook event has been processed (idempotency)
   */
  static async isWebhookProcessed(eventId: string): Promise<boolean> {
    try {
      const existing = await WebhookLog.findOne({ eventId });
      return existing !== null;
    } catch (error) {
      logger.error('Error checking webhook idempotency', {
        eventId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Log webhook event
   */
  static async logWebhook(params: {
    provider: WebhookProvider;
    eventType: string;
    eventId: string;
    paymentId?: string;
    status: WebhookStatus;
    signature?: string;
    payload: Record<string, any>;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await WebhookLog.create({
        webhookId,
        provider: params.provider,
        eventType: params.eventType,
        eventId: params.eventId,
        paymentId: params.paymentId,
        status: params.status,
        signature: params.signature,
        payload: params.payload,
        processedAt: params.status === WebhookStatus.PROCESSED ? new Date() : undefined,
        errorMessage: params.errorMessage,
      });

      logger.info('Webhook logged', {
        webhookId,
        eventType: params.eventType,
        status: params.status,
      });
    } catch (error) {
      logger.error('Error logging webhook', {
        eventId: params.eventId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static async verifySignature(params: {
    provider: WebhookProvider;
    payload: string;
    signature: string;
    secret?: string;
  }): Promise<boolean> {
    try {
      const paymentProvider = PaymentProviderFactory.getProvider(params.provider as any);
      
      const secret = params.secret || process.env.WEBHOOK_SECRET || 'default_secret';

      return await paymentProvider.verifyWebhookSignature({
        payload: params.payload,
        signature: params.signature,
        secret,
      });
    } catch (error) {
      logger.error('Error verifying webhook signature', {
        provider: params.provider,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Compute HMAC signature (for testing)
   */
  static computeSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Get webhook logs
   */
  static async getWebhookLogs(filters: {
    provider?: WebhookProvider;
    eventType?: string;
    status?: WebhookStatus;
    paymentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    try {
      const query: any = {};

      if (filters.provider) {
        query.provider = filters.provider;
      }

      if (filters.eventType) {
        query.eventType = filters.eventType;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.paymentId) {
        query.paymentId = filters.paymentId;
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const [logs, total] = await Promise.all([
        WebhookLog.find(query).sort({ createdAt: -1 }).limit(limit).skip(offset).exec(),
        WebhookLog.countDocuments(query),
      ]);

      return { logs, total };
    } catch (error) {
      logger.error('Error getting webhook logs', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

