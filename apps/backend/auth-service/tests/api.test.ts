import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User, RefreshToken } from '../src/models';
import app from '../src/index';

describe('Auth API Integration Tests', () => {
  const testEmail = 'integration@example.com';
  const testPassword = 'testPassword123';
  const testName = 'Integration Test User';
  const baseUrl = 'http://localhost:3000';

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await RefreshToken.deleteMany({});
    await User.deleteMany({ email: testEmail });
  });

  afterAll(async () => {
    // Final cleanup
    await RefreshToken.deleteMany({});
    await User.deleteMany({ email: testEmail });
    await disconnectDatabase();
  });

  describe('POST /register', () => {
    test('should register new user successfully', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(testEmail);
      expect(data.data.user.name).toBe(testName);
      expect(data.data.tokens.accessToken).toBeDefined();
      expect(data.data.tokens.refreshToken).toBeDefined();
    });

    test('should reject duplicate email', async () => {
      // Register first time
      await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );

      // Try to register again
      const response = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_EXISTS');
    });

    test('should reject invalid email', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'invalid-email',
            password: testPassword,
            name: testName,
          }),
        })
      );

      expect(response.status).toBe(400);
    });

    test('should reject short password', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: '12345',
            name: testName,
          }),
        })
      );

      expect(response.status).toBe(400);
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );
    });

    test('should login with correct credentials', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(testEmail);
      expect(data.data.tokens.accessToken).toBeDefined();
    });

    test('should reject incorrect password', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: 'wrongPassword',
          }),
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should reject non-existent email', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'nonexistent@example.com',
            password: testPassword,
          }),
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /guest', () => {
    test('should create guest user successfully', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Guest User',
          }),
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.name).toBe('Guest User');
      expect(data.data.user.isGuest).toBe(true);
      expect(data.data.user.email).toBeNull();
      expect(data.data.tokens.accessToken).toBeDefined();

      // Clean up
      await User.findByIdAndDelete(data.data.user.id);
    });
  });

  describe('POST /refresh', () => {
    test('should refresh tokens successfully', async () => {
      // Register and get tokens
      const registerResponse = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );

      const registerData = await registerResponse.json();
      const refreshToken = registerData.data.tokens.refreshToken;

      // Refresh tokens
      const response = await app.fetch(
        new Request(`${baseUrl}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken,
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.tokens.accessToken).toBeDefined();
      expect(data.data.tokens.refreshToken).not.toBe(refreshToken);
    });

    test('should reject invalid refresh token', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: 'invalid.token.here',
          }),
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /logout', () => {
    test('should logout successfully', async () => {
      // Register and get tokens
      const registerResponse = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );

      const registerData = await registerResponse.json();
      const refreshToken = registerData.data.tokens.refreshToken;

      // Logout
      const response = await app.fetch(
        new Request(`${baseUrl}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken,
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Try to use revoked token
      const refreshResponse = await app.fetch(
        new Request(`${baseUrl}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken,
          }),
        })
      );

      expect(refreshResponse.status).toBe(401);
    });
  });

  describe('GET /me', () => {
    test('should get current user profile', async () => {
      // Register and get tokens
      const registerResponse = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );

      const registerData = await registerResponse.json();
      const accessToken = registerData.data.tokens.accessToken;

      // Get profile
      const response = await app.fetch(
        new Request(`${baseUrl}/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(testEmail);
      expect(data.data.name).toBe(testName);
    });

    test('should reject request without token', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/me`, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    test('should reject request with invalid token', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/me`, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer invalid.token.here',
          },
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('PATCH /me', () => {
    test('should update user profile', async () => {
      // Register and get tokens
      const registerResponse = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );

      const registerData = await registerResponse.json();
      const accessToken = registerData.data.tokens.accessToken;

      // Update profile
      const response = await app.fetch(
        new Request(`${baseUrl}/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: 'Updated Name',
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
    });
  });

  describe('POST /verify-token', () => {
    test('should verify valid token', async () => {
      // Register and get tokens
      const registerResponse = await app.fetch(
        new Request(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        })
      );

      const registerData = await registerResponse.json();
      const accessToken = registerData.data.tokens.accessToken;

      // Verify token
      const response = await app.fetch(
        new Request(`${baseUrl}/verify-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: accessToken,
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(testEmail);
      expect(data.data.userId).toBeDefined();
    });

    test('should reject invalid token', async () => {
      const response = await app.fetch(
        new Request(`${baseUrl}/verify-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'invalid.token.here',
          }),
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /guest/claim', () => {
    test('should claim guest account successfully', async () => {
      // Create guest
      const guestResponse = await app.fetch(
        new Request(`${baseUrl}/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Guest User',
          }),
        })
      );

      const guestData = await guestResponse.json();
      const accessToken = guestData.data.tokens.accessToken;

      // Claim account
      const response = await app.fetch(
        new Request(`${baseUrl}/guest/claim`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(testEmail);
      expect(data.data.user.isGuest).toBe(false);
    });
  });
});

