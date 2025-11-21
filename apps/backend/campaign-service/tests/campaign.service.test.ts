import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import { CampaignService } from '../src/services/campaign.service';
import { Campaign, CampaignStatus } from '../src/models/campaign.model';

// Test database connection
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
});

describe('CampaignService', () => {
  describe('createCampaign', () => {
    test('should create a campaign successfully', async () => {
      const input = {
        title: 'Test Campaign',
        description: 'This is a test campaign for medical support',
        goalAmount: 10000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        category: 'Medical',
      };

      const campaign = await CampaignService.createCampaign(input, 'user_123');

      expect(campaign).toBeDefined();
      expect(campaign.title).toBe(input.title);
      expect(campaign.description).toBe(input.description);
      expect(campaign.goalAmount).toBe(input.goalAmount);
      expect(campaign.currentAmount).toBe(0);
      expect(campaign.status).toBe(CampaignStatus.DRAFT);
      expect(campaign.ownerId).toBe('user_123');
    });

    test('should throw error for invalid date range', async () => {
      const input = {
        title: 'Test Campaign',
        description: 'This is a test campaign',
        goalAmount: 10000,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'), // End before start
      };

      await expect(
        CampaignService.createCampaign(input, 'user_123')
      ).rejects.toThrow();
    });
  });

  describe('getCampaignById', () => {
    test('should get campaign by ID', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Test description',
        goalAmount: 5000,
        currentAmount: 0,
        status: CampaignStatus.ACTIVE,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const result = await CampaignService.getCampaignById(campaign._id.toString());

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Campaign');
    });

    test('should throw error for non-existent campaign', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        CampaignService.getCampaignById(fakeId)
      ).rejects.toThrow();
    });
  });

  describe('listCampaigns', () => {
    test('should list campaigns with pagination', async () => {
      // Create test campaigns
      await Campaign.create([
        {
          title: 'Campaign 1',
          description: 'Description 1',
          goalAmount: 1000,
          ownerId: 'user_123',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        {
          title: 'Campaign 2',
          description: 'Description 2',
          goalAmount: 2000,
          ownerId: 'user_456',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      ]);

      const result = await CampaignService.listCampaigns(
        {},
        { page: 1, pageSize: 10 }
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    test('should filter campaigns by status', async () => {
      await Campaign.create([
        {
          title: 'Active Campaign',
          description: 'Description',
          goalAmount: 1000,
          status: CampaignStatus.ACTIVE,
          ownerId: 'user_123',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        {
          title: 'Draft Campaign',
          description: 'Description',
          goalAmount: 2000,
          status: CampaignStatus.DRAFT,
          ownerId: 'user_456',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      ]);

      const result = await CampaignService.listCampaigns(
        { status: CampaignStatus.ACTIVE },
        { page: 1, pageSize: 10 }
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe(CampaignStatus.ACTIVE);
    });
  });

  describe('updateCampaign', () => {
    test('should update campaign successfully', async () => {
      const campaign = await Campaign.create({
        title: 'Original Title',
        description: 'Original description',
        goalAmount: 5000,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const updated = await CampaignService.updateCampaign(
        campaign._id.toString(),
        {
          title: 'Updated Title',
          goalAmount: 7500,
        }
      );

      expect(updated.title).toBe('Updated Title');
      expect(updated.goalAmount).toBe(7500);
      expect(updated.description).toBe('Original description');
    });
  });

  describe('updateCurrentAmount', () => {
    test('should update campaign current amount', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Description',
        goalAmount: 10000,
        currentAmount: 0,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const updated = await CampaignService.updateCurrentAmount(
        campaign._id.toString(),
        500
      );

      expect(updated.currentAmount).toBe(500);
    });

    test('should not allow negative current amount', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Description',
        goalAmount: 10000,
        currentAmount: 100,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const updated = await CampaignService.updateCurrentAmount(
        campaign._id.toString(),
        -200
      );

      expect(updated.currentAmount).toBe(0);
    });
  });

  describe('isOwner', () => {
    test('should return true for campaign owner', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Description',
        goalAmount: 5000,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const isOwner = await CampaignService.isOwner(
        campaign._id.toString(),
        'user_123'
      );

      expect(isOwner).toBe(true);
    });

    test('should return false for non-owner', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Description',
        goalAmount: 5000,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const isOwner = await CampaignService.isOwner(
        campaign._id.toString(),
        'user_456'
      );

      expect(isOwner).toBe(false);
    });
  });
});

