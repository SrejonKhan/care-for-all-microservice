import { describe, test, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import mongoose from 'mongoose';
import { Outbox, OutboxStatus } from '../src/models/outbox.model';
import { OutboxPublisherService } from '../src/services/outbox-publisher.service';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campaign-service-test';

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Outbox.deleteMany({});
});

describe('OutboxPublisherService', () => {
  describe('getStatistics', () => {
    test('should return correct Outbox statistics', async () => {
      // Create test Outbox entries
      await Outbox.create([
        {
          eventId: 'evt_1',
          eventType: 'campaign.donation_received',
          payload: { test: 'data' },
          status: OutboxStatus.PENDING,
        },
        {
          eventId: 'evt_2',
          eventType: 'campaign.donation_received',
          payload: { test: 'data' },
          status: OutboxStatus.PENDING,
        },
        {
          eventId: 'evt_3',
          eventType: 'campaign.donation_refunded',
          payload: { test: 'data' },
          status: OutboxStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        {
          eventId: 'evt_4',
          eventType: 'campaign.donation_received',
          payload: { test: 'data' },
          status: OutboxStatus.FAILED,
          retryCount: 5,
        },
      ]);

      const stats = await OutboxPublisherService.getStatistics();

      expect(stats.pending).toBe(2);
      expect(stats.published).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.total).toBe(4);
    });
  });

  describe('retryFailedEvent', () => {
    test('should reset failed event to pending', async () => {
      const failedEvent = await Outbox.create({
        eventId: 'evt_failed',
        eventType: 'campaign.donation_received',
        payload: { test: 'data' },
        status: OutboxStatus.FAILED,
        retryCount: 5,
        lastError: 'RabbitMQ connection error',
      });

      const result = await OutboxPublisherService.retryFailedEvent('evt_failed');

      expect(result).toBe(true);

      const updatedEvent = await Outbox.findById(failedEvent._id);
      expect(updatedEvent?.status).toBe(OutboxStatus.PENDING);
      expect(updatedEvent?.retryCount).toBe(0);
      // lastError field should not exist after reset (unset)
      expect('lastError' in updatedEvent!.toObject()).toBe(false);
    });

    test('should return false for non-existent event', async () => {
      const result = await OutboxPublisherService.retryFailedEvent('evt_nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Outbox Model', () => {
    test('should create Outbox entry with default values', async () => {
      const entry = await Outbox.create({
        eventId: 'evt_test',
        eventType: 'campaign.donation_received',
        payload: { campaignId: 'camp_123', amount: 500 },
      });

      expect(entry.status).toBe(OutboxStatus.PENDING);
      expect(entry.retryCount).toBe(0);
      expect(entry.publishedAt).toBeUndefined();
    });

    test('should enforce unique eventId', async () => {
      await Outbox.create({
        eventId: 'evt_unique',
        eventType: 'test.event',
        payload: { test: 'data' },
      });

      // Attempt to create duplicate - should fail with duplicate key error
      try {
        await Outbox.create({
          eventId: 'evt_unique',
          eventType: 'test.event',
          payload: { test: 'data' },
        });
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error: any) {
        // Expect a duplicate key error
        expect(error.code).toBe(11000);
      }
    });

    test('should allow only valid status values', async () => {
      const entry = await Outbox.create({
        eventId: 'evt_status_test',
        eventType: 'test.event',
        payload: { test: 'data' },
        status: OutboxStatus.PENDING,
      });

      expect(Object.values(OutboxStatus)).toContain(entry.status);
    });
  });
});

