import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import { Campaign, CampaignStatus } from '../src/models/campaign.model';
import * as jwt from 'jsonwebtoken';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campaign-service-test';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const API_URL = process.env.API_URL || 'http://localhost:3001';

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

// Helper function to generate JWT token
function generateToken(userId: string, role: string = 'USER'): string {
  return jwt.sign(
    {
      userId,
      email: 'test@example.com',
      role,
      isGuest: false,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Campaign API', () => {
  describe('GET /campaigns', () => {
    test('should list campaigns', async () => {
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

      const response = await fetch(`${API_URL}/campaigns`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(2);
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

      const response = await fetch(`${API_URL}/campaigns?status=ACTIVE`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].status).toBe('ACTIVE');
    });
  });

  describe('GET /campaigns/:id', () => {
    test('should get campaign by ID', async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        description: 'Test description',
        goalAmount: 5000,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const response = await fetch(`${API_URL}/campaigns/${campaign._id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Test Campaign');
    });

    test('should return 404 for non-existent campaign', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await fetch(`${API_URL}/campaigns/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /campaigns', () => {
    test('should create campaign with authentication', async () => {
      const token = generateToken('user_123', 'USER');

      const response = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'New Campaign',
          description: 'This is a new campaign for testing',
          goalAmount: 10000,
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          category: 'Medical',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('New Campaign');
      expect(data.data.ownerId).toBe('user_123');
    });

    test('should reject unauthenticated requests', async () => {
      const response = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Campaign',
          description: 'Description',
          goalAmount: 10000,
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /campaigns/:id', () => {
    test('should update campaign as owner', async () => {
      const campaign = await Campaign.create({
        title: 'Original Title',
        description: 'Original description',
        goalAmount: 5000,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const token = generateToken('user_123', 'CAMPAIGN_OWNER');

      const response = await fetch(`${API_URL}/campaigns/${campaign._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Updated Title',
          goalAmount: 7500,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Title');
      expect(data.data.goalAmount).toBe(7500);
    });

    test('should reject update from non-owner', async () => {
      const campaign = await Campaign.create({
        title: 'Original Title',
        description: 'Original description',
        goalAmount: 5000,
        ownerId: 'user_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const token = generateToken('user_456', 'CAMPAIGN_OWNER');

      const response = await fetch(`${API_URL}/campaigns/${campaign._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Updated Title',
        }),
      });

      expect(response.status).toBe(403);
    });
  });
});

