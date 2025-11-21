import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { DonationService } from '../src/services/donation.service';
import { Donation, DonationStatus } from '../src/models/donation.model';

describe('DonationService', () => {
  beforeAll(async () => {
    // Use test database
    process.env.DATABASE_URL = 'mongodb://localhost:27017/donation-service-test';
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up
    await Donation.deleteMany({});
    await disconnectDatabase();
  });

  describe('createDonation', () => {
    test('should create a donation for registered user', async () => {
      const input = {
        campaignId: 'campaign_123',
        amount: 10000,
        donorId: 'user_123',
        donorName: 'John Doe',
        isAnonymous: false,
        isGuest: false,
        bankAccountId: 'bank_acc_001',
      };

      const donation = await DonationService.createDonation(input);

      expect(donation).toBeDefined();
      expect(donation.campaignId).toBe(input.campaignId);
      expect(donation.amount).toBe(input.amount);
      expect(donation.donorId).toBe(input.donorId);
      expect(donation.status).toBe(DonationStatus.PENDING);
      expect(donation.isGuest).toBe(false);
    });

    test('should create a guest donation', async () => {
      const input = {
        campaignId: 'campaign_456',
        amount: 5000,
        donorName: 'Anonymous',
        donorEmail: 'guest@example.com',
        isAnonymous: true,
        isGuest: true,
        bankAccountId: 'bank_acc_guest',
      };

      const donation = await DonationService.createDonation(input);

      expect(donation).toBeDefined();
      expect(donation.campaignId).toBe(input.campaignId);
      expect(donation.amount).toBe(input.amount);
      expect(donation.donorId).toBeUndefined();
      expect(donation.isGuest).toBe(true);
      expect(donation.isAnonymous).toBe(true);
    });
  });

  describe('getDonationById', () => {
    test('should get donation by ID', async () => {
      const created = await DonationService.createDonation({
        campaignId: 'campaign_789',
        amount: 15000,
        donorId: 'user_456',
        bankAccountId: 'bank_acc_002',
      });

      const found = await DonationService.getDonationById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.campaignId).toBe(created.campaignId);
    });

    test('should return null for non-existent donation', async () => {
      const found = await DonationService.getDonationById('nonexistent_id');

      expect(found).toBeNull();
    });
  });

  describe('updateDonation', () => {
    test('should update donation status', async () => {
      const created = await DonationService.createDonation({
        campaignId: 'campaign_update',
        amount: 20000,
        donorId: 'user_789',
        bankAccountId: 'bank_acc_003',
      });

      const updated = await DonationService.updateDonation(created.id, {
        status: DonationStatus.BALANCE_CHECK,
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe(DonationStatus.BALANCE_CHECK);
    });

    test('should validate state transition', async () => {
      const created = await DonationService.createDonation({
        campaignId: 'campaign_invalid',
        amount: 25000,
        donorId: 'user_101',
        bankAccountId: 'bank_acc_004',
      });

      // Try invalid transition: PENDING -> COMPLETED
      await expect(
        DonationService.updateDonation(created.id, {
          status: DonationStatus.COMPLETED,
        })
      ).rejects.toThrow();
    });
  });

  describe('listDonations', () => {
    test('should list donations with pagination', async () => {
      // Create multiple donations
      await DonationService.createDonation({
        campaignId: 'campaign_list',
        amount: 1000,
        donorId: 'user_list_1',
        bankAccountId: 'bank_acc_001',
      });

      await DonationService.createDonation({
        campaignId: 'campaign_list',
        amount: 2000,
        donorId: 'user_list_2',
        bankAccountId: 'bank_acc_002',
      });

      const result = await DonationService.listDonations(
        { campaignId: 'campaign_list' },
        { page: 1, limit: 10 }
      );

      expect(result.donations.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});

