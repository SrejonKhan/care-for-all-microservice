import { createLogger } from '@care-for-all/shared-logger';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'payment-service',
  minLevel: 'info',
});

// In-memory store for idempotency keys (in production, use Redis)
const idempotencyStore = new Map<string, {
  response: any;
  createdAt: Date;
  expiresAt: Date;
}>();

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// IDEMPOTENCY SERVICE
// ============================================================================

export class IdempotencyService {
  /**
   * Generate a unique idempotency key
   */
  static generateKey(prefix: string = 'payment'): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Check if an idempotency key has been processed
   */
  static async checkKey(key: string): Promise<{
    exists: boolean;
    response?: any;
  }> {
    try {
      const record = idempotencyStore.get(key);

      if (!record) {
        return { exists: false };
      }

      // Check if expired
      if (record.expiresAt < new Date()) {
        idempotencyStore.delete(key);
        logger.info('Idempotency key expired', { key });
        return { exists: false };
      }

      logger.info('Idempotency key found', { key });
      return {
        exists: true,
        response: record.response,
      };
    } catch (error) {
      logger.error('Error checking idempotency key', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Store a response for an idempotency key
   */
  static async storeResponse(key: string, response: any): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_MS);

      idempotencyStore.set(key, {
        response,
        createdAt: now,
        expiresAt,
      });

      logger.info('Stored idempotency response', {
        key,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      logger.error('Error storing idempotency response', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Clean up expired idempotency keys
   */
  static async cleanup(): Promise<number> {
    try {
      const now = new Date();
      let deletedCount = 0;

      for (const [key, record] of idempotencyStore.entries()) {
        if (record.expiresAt < now) {
          idempotencyStore.delete(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info('Cleaned up expired idempotency keys', { count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up idempotency keys', {
        error: (error as Error).message,
      });
      return 0;
    }
  }

  /**
   * Get idempotency store stats
   */
  static getStats(): {
    total: number;
    expired: number;
  } {
    const now = new Date();
    let expired = 0;

    for (const record of idempotencyStore.values()) {
      if (record.expiresAt < now) {
        expired++;
      }
    }

    return {
      total: idempotencyStore.size,
      expired,
    };
  }

  /**
   * Clear all idempotency keys (for testing)
   */
  static clear(): void {
    idempotencyStore.clear();
    logger.info('Cleared all idempotency keys');
  }
}

// Periodic cleanup every hour
setInterval(() => {
  IdempotencyService.cleanup();
}, 60 * 60 * 1000);

