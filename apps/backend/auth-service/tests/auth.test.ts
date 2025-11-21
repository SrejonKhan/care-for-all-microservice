import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { AuthService } from '../src/services/auth.service';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User, RefreshToken } from '../src/models';
import { AuthError, ValidationError } from '../src/types/auth.types';

describe('AuthService', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'testPassword123';
  const testName = 'Test User';

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

  describe('register', () => {
    test('should register new user successfully', async () => {
      const result = await AuthService.register(testEmail, testPassword, testName);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail.toLowerCase());
      expect(result.user.name).toBe(testName);
      expect(result.user.isGuest).toBe(false);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    test('should reject duplicate email', async () => {
      await AuthService.register(testEmail, testPassword, testName);

      await expect(
        AuthService.register(testEmail, testPassword, testName)
      ).rejects.toThrow(ValidationError);
    });

    test('should reject short password', async () => {
      await expect(
        AuthService.register(testEmail, '12345', testName)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await AuthService.register(testEmail, testPassword, testName);
    });

    test('should login with correct credentials', async () => {
      const result = await AuthService.login(testEmail, testPassword);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail.toLowerCase());
      expect(result.tokens).toBeDefined();
    });

    test('should reject incorrect password', async () => {
      await expect(
        AuthService.login(testEmail, 'wrongPassword')
      ).rejects.toThrow(AuthError);
    });

    test('should reject non-existent email', async () => {
      await expect(
        AuthService.login('nonexistent@example.com', testPassword)
      ).rejects.toThrow(AuthError);
    });
  });

  describe('createGuest', () => {
    test('should create guest user successfully', async () => {
      const guestName = 'Guest User';
      const result = await AuthService.createGuest(guestName);

      expect(result.user).toBeDefined();
      expect(result.user.name).toBe(guestName);
      expect(result.user.isGuest).toBe(true);
      expect(result.user.email).toBeNull();
      expect(result.tokens).toBeDefined();

      // Clean up
      await User.findByIdAndDelete(result.user.id);
    });

    test('should create multiple guest users', async () => {
      const guest1 = await AuthService.createGuest('Guest 1');
      const guest2 = await AuthService.createGuest('Guest 2');

      expect(guest1.user.id).not.toBe(guest2.user.id);

      // Clean up
      await User.deleteMany({ _id: { $in: [guest1.user.id, guest2.user.id] } });
    });
  });

  describe('refresh', () => {
    test('should refresh tokens successfully', async () => {
      const registerResult = await AuthService.register(testEmail, testPassword, testName);
      const refreshToken = registerResult.tokens.refreshToken;

      const result = await AuthService.refresh(refreshToken);

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).not.toBe(registerResult.tokens.accessToken);
      expect(result.tokens.refreshToken).not.toBe(refreshToken);
    });

    test('should reject invalid refresh token', async () => {
      await expect(
        AuthService.refresh('invalid.token.here')
      ).rejects.toThrow(AuthError);
    });

    test('should reject revoked refresh token', async () => {
      const registerResult = await AuthService.register(testEmail, testPassword, testName);
      const refreshToken = registerResult.tokens.refreshToken;

      // Logout to revoke token
      await AuthService.logout(refreshToken);

      await expect(
        AuthService.refresh(refreshToken)
      ).rejects.toThrow(AuthError);
    });
  });

  describe('logout', () => {
    test('should logout successfully', async () => {
      const registerResult = await AuthService.register(testEmail, testPassword, testName);
      const refreshToken = registerResult.tokens.refreshToken;

      await AuthService.logout(refreshToken);

      // Try to use the revoked token
      await expect(
        AuthService.refresh(refreshToken)
      ).rejects.toThrow(AuthError);
    });

    test('should handle logout with invalid token gracefully', async () => {
      // Should not throw
      await expect(
        AuthService.logout('invalid.token.here')
      ).resolves.toBeUndefined();
    });
  });

  describe('logoutAll', () => {
    test('should logout from all devices', async () => {
      const registerResult = await AuthService.register(testEmail, testPassword, testName);
      const userId = registerResult.user.id;

      // Login again to get another refresh token
      const loginResult = await AuthService.login(testEmail, testPassword);

      // Logout from all devices
      await AuthService.logoutAll(userId);

      // Both tokens should be revoked
      await expect(
        AuthService.refresh(registerResult.tokens.refreshToken)
      ).rejects.toThrow(AuthError);

      await expect(
        AuthService.refresh(loginResult.tokens.refreshToken)
      ).rejects.toThrow(AuthError);
    });
  });

  describe('claimGuestAccount', () => {
    test('should claim guest account successfully', async () => {
      const guestResult = await AuthService.createGuest('Guest User');
      const guestId = guestResult.user.id;

      const result = await AuthService.claimGuestAccount(
        guestId,
        testEmail,
        testPassword
      );

      expect(result.user.id).toBe(guestId);
      expect(result.user.email).toBe(testEmail.toLowerCase());
      expect(result.user.isGuest).toBe(false);
      expect(result.tokens).toBeDefined();
    });

    test('should reject claiming with existing email', async () => {
      // Register a normal user
      await AuthService.register(testEmail, testPassword, testName);

      // Create a guest
      const guestResult = await AuthService.createGuest('Guest User');

      // Try to claim with existing email
      await expect(
        AuthService.claimGuestAccount(guestResult.user.id, testEmail, testPassword)
      ).rejects.toThrow(ValidationError);

      // Clean up guest
      await User.findByIdAndDelete(guestResult.user.id);
    });

    test('should reject claiming non-guest account', async () => {
      const registerResult = await AuthService.register(testEmail, testPassword, testName);

      await expect(
        AuthService.claimGuestAccount(registerResult.user.id, 'new@example.com', testPassword)
      ).rejects.toThrow(ValidationError);
    });

    test('should reject short password when claiming', async () => {
      const guestResult = await AuthService.createGuest('Guest User');

      await expect(
        AuthService.claimGuestAccount(guestResult.user.id, testEmail, '12345')
      ).rejects.toThrow(ValidationError);

      // Clean up
      await User.findByIdAndDelete(guestResult.user.id);
    });
  });

  describe('verifyToken', () => {
    test('should verify valid access token', async () => {
      const registerResult = await AuthService.register(testEmail, testPassword, testName);
      const accessToken = registerResult.tokens.accessToken;

      const result = AuthService.verifyToken(accessToken);

      expect(result.userId).toBe(registerResult.user.id);
      expect(result.email).toBe(testEmail.toLowerCase());
      expect(result.isGuest).toBe(false);
    });

    test('should reject invalid token', () => {
      expect(() => {
        AuthService.verifyToken('invalid.token.here');
      }).toThrow(AuthError);
    });

    test('should verify guest user token', async () => {
      const guestResult = await AuthService.createGuest('Guest User');
      const accessToken = guestResult.tokens.accessToken;

      const result = AuthService.verifyToken(accessToken);

      expect(result.userId).toBe(guestResult.user.id);
      expect(result.email).toBeNull();
      expect(result.isGuest).toBe(true);

      // Clean up
      await User.findByIdAndDelete(guestResult.user.id);
    });
  });
});
