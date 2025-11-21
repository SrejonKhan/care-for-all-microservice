import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { WebhookService } from '../src/services/webhook.service';
import { WebhookStatus, WebhookProvider } from '../src/models';

const TEST_DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/payment-service-test';

describe('WebhookService', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URL);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('should log webhook event', async () => {
    const params = {
      provider: WebhookProvider.MOCK,
      eventType: 'payment.authorized',
      eventId: 'evt_test_123',
      paymentId: 'pay_test_123',
      status: WebhookStatus.PROCESSED,
      payload: { test: true },
    };

    await WebhookService.logWebhook(params);

    const isProcessed = await WebhookService.isWebhookProcessed(params.eventId);
    expect(isProcessed).toBe(true);
  });

  test('should detect duplicate webhooks', async () => {
    const eventId = 'evt_duplicate_test';

    // Log first webhook
    await WebhookService.logWebhook({
      provider: WebhookProvider.MOCK,
      eventType: 'payment.captured',
      eventId,
      status: WebhookStatus.PROCESSED,
      payload: {},
    });

    // Check if processed
    const isProcessed = await WebhookService.isWebhookProcessed(eventId);
    expect(isProcessed).toBe(true);
  });

  test('should compute signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'test_secret';

    const signature1 = WebhookService.computeSignature(payload, secret);
    const signature2 = WebhookService.computeSignature(payload, secret);

    expect(signature1).toBe(signature2);
    expect(signature1).toBeDefined();
  });
});

