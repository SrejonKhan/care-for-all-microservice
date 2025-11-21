import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { TokenService } from '../src/services/token.service';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User, RefreshToken, UserRole } from '../src/models';
import { AuthError } from '../src/types/auth.types';

describe('TokenService', () => {
  // Test user ID
  const testUserId = 'test-user-id-123';
  const testEmail = 'test@example.com';
  const testRole = UserRole.USER;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up test data
    await RefreshToken.deleteMany({ userId: testUserId });
    await User.deleteMany({ email: testEmail });
    await disconnectDatabase();
  });

  describe('generateAccessToken', () => {
    test('should generate valid access token', () => {
      const token = TokenService.generateAccessToken({
        userId: testUserId,
        email: testEmail,
        role: testRole,
        isGuest: false,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should generate token with guest flag', () => {
      const token = TokenService.generateAccessToken({
        userId: testUserId,
        email: null,
        role: testRole,
        isGuest: true,
      });

      expect(token).toBeDefined();
      const payload = TokenService.verifyAccessToken(token);
      expect(payload.isGuest).toBe(true);
      expect(payload.email).toBeNull();
    });
  });

  describe('verifyAccessToken', () => {
    test('should verify valid access token', () => {
      const token = TokenService.generateAccessToken({
        userId: testUserId,
        email: testEmail,
        role: testRole,
        isGuest: false,
      });

      const payload = TokenService.verifyAccessToken(token);

      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
      expect(payload.role).toBe(testRole);
      expect(payload.isGuest).toBe(false);
    });

    test('should reject invalid token', () => {
      expect(() => {
        TokenService.verifyAccessToken('invalid.token.here');
      }).toThrow(AuthError);
    });

    test('should reject empty token', () => {
      expect(() => {
        TokenService.verifyAccessToken('');
      }).toThrow(AuthError);
    });

    test('should reject malformed token', () => {
      expect(() => {
        TokenService.verifyAccessToken('not-a-jwt-token');
      }).toThrow(AuthError);
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate and store refresh token', async () => {
      // Create a test user first
      const user = await User.create({
        _id: testUserId,
        name: 'Test User',
        role: UserRole.USER,
        isGuest: false,
      });

      const token = await TokenService.generateRefreshToken(testUserId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token is stored in database
      const payload = TokenService.verifyRefreshToken(token);
      const storedToken = await RefreshToken.findById(payload.tokenId);

      expect(storedToken).toBeDefined();
      expect(storedToken?.userId).toBe(testUserId);
      expect(storedToken?.revoked).toBe(false);

      // Clean up
      await User.findByIdAndDelete(testUserId);
    });
  });

  describe('isRefreshTokenValid', () => {
    test('should validate active refresh token', async () => {
      // Create a test user
      await User.create({
        _id: testUserId,
        name: 'Test User',
        role: UserRole.USER,
        isGuest: false,
      });

      const token = await TokenService.generateRefreshToken(testUserId);
      const payload = TokenService.verifyRefreshToken(token);
      const isValid = await TokenService.isRefreshTokenValid(payload.tokenId);

      expect(isValid).toBe(true);

      // Clean up
      await User.findByIdAndDelete(testUserId);
    });

    test('should reject revoked token', async () => {
      // Create a test user
      await User.create({
        _id: testUserId,
        name: 'Test User',
        role: UserRole.USER,
        isGuest: false,
      });

      const token = await TokenService.generateRefreshToken(testUserId);
      const payload = TokenService.verifyRefreshToken(token);

      // Revoke the token
      await TokenService.revokeRefreshToken(payload.tokenId);

      const isValid = await TokenService.isRefreshTokenValid(payload.tokenId);
      expect(isValid).toBe(false);

      // Clean up
      await User.findByIdAndDelete(testUserId);
    });

    test('should reject non-existent token', async () => {
      const isValid = await TokenService.isRefreshTokenValid('507f1f77bcf86cd799439011');
      expect(isValid).toBe(false);
    });
  });

  describe('revokeRefreshToken', () => {
    test('should revoke refresh token', async () => {
      // Create a test user
      await User.create({
        _id: testUserId,
        name: 'Test User',
        role: UserRole.USER,
        isGuest: false,
      });

      const token = await TokenService.generateRefreshToken(testUserId);
      const payload = TokenService.verifyRefreshToken(token);

      await TokenService.revokeRefreshToken(payload.tokenId);

      const storedToken = await RefreshToken.findById(payload.tokenId);

      expect(storedToken?.revoked).toBe(true);

      // Clean up
      await User.findByIdAndDelete(testUserId);
    });
  });

  describe('revokeAllUserTokens', () => {
    test('should revoke all user tokens', async () => {
      // Create a test user
      await User.create({
        _id: testUserId,
        name: 'Test User',
        role: UserRole.USER,
        isGuest: false,
      });

      // Generate multiple tokens
      await TokenService.generateRefreshToken(testUserId);
      await TokenService.generateRefreshToken(testUserId);
      await TokenService.generateRefreshToken(testUserId);

      // Revoke all tokens
      await TokenService.revokeAllUserTokens(testUserId);

      // Check all tokens are revoked
      const tokens = await RefreshToken.find({ userId: testUserId });

      expect(tokens.every(t => t.revoked)).toBe(true);

      // Clean up
      await User.findByIdAndDelete(testUserId);
    });
  });

  describe('generateTokenPair', () => {
    test('should generate both access and refresh tokens', async () => {
      // Create a test user
      await User.create({
        _id: testUserId,
        name: 'Test User',
        email: testEmail,
        role: UserRole.USER,
        isGuest: false,
      });

      const tokenPair = await TokenService.generateTokenPair(
        testUserId,
        testEmail,
        testRole,
        false
      );

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBeGreaterThan(0);

      // Verify both tokens are valid
      const accessPayload = TokenService.verifyAccessToken(tokenPair.accessToken);
      expect(accessPayload.userId).toBe(testUserId);

      const refreshPayload = TokenService.verifyRefreshToken(tokenPair.refreshToken);
      expect(refreshPayload.userId).toBe(testUserId);

      // Clean up
      await User.findByIdAndDelete(testUserId);
    });
  });
});
