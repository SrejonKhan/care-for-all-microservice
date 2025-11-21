import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import { DonationEventHandlerService } from '../src/services/donation-event-handler.service';
import { Campaign, CampaignStatus } from '../src/models/campaign.model';
import { EventLog, EventStatus } from '../src/models/event-log.model';
import { Outbox, OutboxStatus } from '../src/models/outbox.model';
import {
  DonationCreatedEvent,
  DonationRefundedEvent,
} from '../src/types/events.types';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campaign-service-test';

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Campaign.deleteMany({});
  await EventLog.deleteMany({});
  await Outbox.deleteMany({});
});

describe('DonationEventHandlerService with Outbox', () => {
  describe('handleDonationCreated', () => {
    test('should increment campaign amount and create Outbox entry', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Description',
        goalAmount: 10000,
        currentAmount: 0,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const event: DonationCreatedEvent = {
        eventId: 'evt_123',
        eventType: 'donation.created',
        timestamp: new Date().toISOString(),
        version: '1.0',
        payload: {
          donationId: 'don_123',
          campaignId: campaign._id.toString(),
          amount: 500,
          donorId: 'donor_123',
          donorName: 'John Doe',
          isAnonymous: false,
          timestamp: new Date().toISOString(),
        },
      };

      await DonationEventHandlerService.handleDonationCreated(event);

      // Check campaign amount updated
      const updatedCampaign = await Campaign.findById(campaign._id);
      expect(updatedCampaign?.currentAmount).toBe(500);

      // Check event log created
      const eventLog = await EventLog.findOne({ eventId: 'evt_123' });
      expect(eventLog).toBeDefined();
      expect(eventLog?.status).toBe(EventStatus.PROCESSED);

      // Check Outbox entry created
      const outboxEntry = await Outbox.findOne({
        eventType: 'campaign.donation_received',
      });
      expect(outboxEntry).toBeDefined();
      expect(outboxEntry?.status).toBe(OutboxStatus.PENDING);
      expect(outboxEntry?.payload.campaignId).toBe(campaign._id.toString());
      expect(outboxEntry?.payload.amount).toBe(500);
    });

    test('should not process duplicate events (idempotency)', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Description',
        goalAmount: 10000,
        currentAmount: 0,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const event: DonationCreatedEvent = {
        eventId: 'evt_123',
        eventType: 'donation.created',
        timestamp: new Date().toISOString(),
        version: '1.0',
        payload: {
          donationId: 'don_123',
          campaignId: campaign._id.toString(),
          amount: 500,
          donorId: 'donor_123',
          donorName: 'John Doe',
          isAnonymous: false,
          timestamp: new Date().toISOString(),
        },
      };

      // Process event first time
      await DonationEventHandlerService.handleDonationCreated(event);

      // Process same event again
      await DonationEventHandlerService.handleDonationCreated(event);

      const updatedCampaign = await Campaign.findById(campaign._id);
      // Amount should only be incremented once
      expect(updatedCampaign?.currentAmount).toBe(500);

      // Should only have one Outbox entry
      const outboxCount = await Outbox.countDocuments({
        eventType: 'campaign.donation_received',
      });
      expect(outboxCount).toBe(1);
    });

    test('should rollback transaction on error', async () => {
      const event: DonationCreatedEvent = {
        eventId: 'evt_invalid',
        eventType: 'donation.created',
        timestamp: new Date().toISOString(),
        version: '1.0',
        payload: {
          donationId: 'don_123',
          campaignId: 'invalid_campaign_id', // Invalid ID will cause error
          amount: 500,
          donorId: 'donor_123',
          donorName: 'John Doe',
          isAnonymous: false,
          timestamp: new Date().toISOString(),
        },
      };

      // Should throw error
      await expect(
        DonationEventHandlerService.handleDonationCreated(event)
      ).rejects.toThrow();

      // Check no Outbox entry was created (transaction rolled back)
      const outboxCount = await Outbox.countDocuments({});
      expect(outboxCount).toBe(0);

      // Check event marked as failed
      const eventLog = await EventLog.findOne({ eventId: 'evt_invalid' });
      expect(eventLog?.status).toBe(EventStatus.FAILED);
    });
  });

  describe('handleDonationRefunded', () => {
    test('should decrement campaign amount and create Outbox entry', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Description',
        goalAmount: 10000,
        currentAmount: 1000,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const event: DonationRefundedEvent = {
        eventId: 'evt_456',
        eventType: 'donation.refunded',
        timestamp: new Date().toISOString(),
        version: '1.0',
        payload: {
          donationId: 'don_123',
          campaignId: campaign._id.toString(),
          amount: 300,
          reason: 'Customer request',
          timestamp: new Date().toISOString(),
        },
      };

      await DonationEventHandlerService.handleDonationRefunded(event);

      // Check campaign amount decreased
      const updatedCampaign = await Campaign.findById(campaign._id);
      expect(updatedCampaign?.currentAmount).toBe(700);

      // Check Outbox entry created
      const outboxEntry = await Outbox.findOne({
        eventType: 'campaign.donation_refunded',
      });
      expect(outboxEntry).toBeDefined();
      expect(outboxEntry?.status).toBe(OutboxStatus.PENDING);
      expect(outboxEntry?.payload.amount).toBe(300);
    });

    test('should not allow negative campaign amount', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Description',
        goalAmount: 10000,
        currentAmount: 100,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const event: DonationRefundedEvent = {
        eventId: 'evt_789',
        eventType: 'donation.refunded',
        timestamp: new Date().toISOString(),
        version: '1.0',
        payload: {
          donationId: 'don_123',
          campaignId: campaign._id.toString(),
          amount: 200,
          reason: 'Customer request',
          timestamp: new Date().toISOString(),
        },
      };

      await DonationEventHandlerService.handleDonationRefunded(event);

      // Check campaign amount is 0 (not negative)
      const updatedCampaign = await Campaign.findById(campaign._id);
      expect(updatedCampaign?.currentAmount).toBe(0);
    });
  });
});
