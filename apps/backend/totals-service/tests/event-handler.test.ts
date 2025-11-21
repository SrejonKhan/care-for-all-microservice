import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { EventHandlerService } from '../src/services/event-handler.service';
import { TotalsService } from '../src/services/totals.service';
import {
  DonationCreatedEvent,
  DonationRefundedEvent,
} from '../src/types/events.types';

const TEST_DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/totals-service-test';

describe('EventHandlerService', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URL);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('should handle donation.created event', async () => {
    const campaignId = 'camp_event_test_1';
    const event: DonationCreatedEvent = {
      eventId: 'evt_test_123',
      eventType: 'donation.created',
      payload: {
        donationId: 'don_test_123',
        campaignId,
        amount: 100,
        donorId: 'user_123',
        donorName: 'Test Donor',
        isAnonymous: false,
        isGuest: false,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    await EventHandlerService.handleDonationCreated(event);

    const totals = await TotalsService.getCampaignTotals(campaignId);
    expect(totals).toBeDefined();
    expect(totals?.totalAmount).toBe(100);
    expect(totals?.totalPledges).toBe(1);
    expect(totals?.totalDonors).toBe(1);
  });

  test('should handle donation.refunded event', async () => {
    const campaignId = 'camp_event_test_2';

    // First create a donation
    const createEvent: DonationCreatedEvent = {
      eventId: 'evt_test_456',
      eventType: 'donation.created',
      payload: {
        donationId: 'don_test_456',
        campaignId,
        amount: 200,
        donorId: 'user_456',
        isAnonymous: false,
        isGuest: false,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    await EventHandlerService.handleDonationCreated(createEvent);

    // Then refund it
    const refundEvent: DonationRefundedEvent = {
      eventId: 'evt_test_789',
      eventType: 'donation.refunded',
      payload: {
        donationId: 'don_test_456',
        campaignId,
        amount: 200,
        reason: 'Test refund',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    await EventHandlerService.handleDonationRefunded(refundEvent);

    const totals = await TotalsService.getCampaignTotals(campaignId);
    expect(totals).toBeDefined();
    expect(totals?.totalAmount).toBe(0);
    expect(totals?.totalPledges).toBe(0);
  });

  test('should handle duplicate events (idempotency)', async () => {
    const campaignId = 'camp_event_test_3';
    const event: DonationCreatedEvent = {
      eventId: 'evt_duplicate_test',
      eventType: 'donation.created',
      payload: {
        donationId: 'don_duplicate',
        campaignId,
        amount: 50,
        donorId: 'user_dup',
        isAnonymous: false,
        isGuest: false,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    // Process first time
    await EventHandlerService.handleDonationCreated(event);

    // Process again (should be idempotent)
    await EventHandlerService.handleDonationCreated(event);

    const totals = await TotalsService.getCampaignTotals(campaignId);
    expect(totals).toBeDefined();
    // Should only be counted once
    expect(totals?.totalAmount).toBe(50);
    expect(totals?.totalPledges).toBe(1);
  });
});

