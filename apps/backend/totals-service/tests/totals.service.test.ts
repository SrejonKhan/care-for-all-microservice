import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { TotalsService } from '../src/services/totals.service';

// Test database connection
const TEST_DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/totals-service-test';

describe('TotalsService', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URL);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('should get or create campaign totals', async () => {
    const campaignId = 'camp_test_123';

    const totals = await TotalsService.getOrCreateCampaignTotals(campaignId);

    expect(totals).toBeDefined();
    expect(totals.campaignId).toBe(campaignId);
    expect(totals.totalAmount).toBe(0);
    expect(totals.totalPledges).toBe(0);
    expect(totals.totalDonors).toBe(0);
  });

  test('should increment campaign totals', async () => {
    const campaignId = 'camp_test_456';

    const totals = await TotalsService.incrementTotals(campaignId, 100, true, true);

    expect(totals.totalAmount).toBe(100);
    expect(totals.totalPledges).toBe(1);
    expect(totals.totalDonors).toBe(1);

    // Increment again
    const updated = await TotalsService.incrementTotals(campaignId, 50, true, false);

    expect(updated.totalAmount).toBe(150);
    expect(updated.totalPledges).toBe(2);
    expect(updated.totalDonors).toBe(1); // Donor count unchanged
  });

  test('should decrement campaign totals', async () => {
    const campaignId = 'camp_test_789';

    // First increment
    await TotalsService.incrementTotals(campaignId, 200, true, true);

    // Then decrement
    const totals = await TotalsService.decrementTotals(campaignId, 50, true);

    expect(totals.totalAmount).toBe(150);
    expect(totals.totalPledges).toBe(0); // 1 - 1 = 0
  });

  test('should get campaign totals', async () => {
    const campaignId = 'camp_test_get';

    await TotalsService.incrementTotals(campaignId, 300, true, true);

    const totals = await TotalsService.getCampaignTotals(campaignId);

    expect(totals).toBeDefined();
    expect(totals?.totalAmount).toBe(300);
  });

  test('should return null for non-existent campaign', async () => {
    const totals = await TotalsService.getCampaignTotals('non_existent');

    expect(totals).toBeNull();
  });
});

