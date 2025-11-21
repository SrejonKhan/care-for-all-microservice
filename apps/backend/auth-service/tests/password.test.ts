import { describe, test, expect } from 'bun:test';
import { PasswordService } from '../src/services/password.service';

describe('PasswordService', () => {
  describe('hash', () => {
    test('should hash a password successfully', async () => {
      const password = 'testPassword123';
      const hash = await PasswordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await PasswordService.hash(password);
      const hash2 = await PasswordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    test('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await PasswordService.hash(password);
      const isValid = await PasswordService.verify(password, hash);

      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await PasswordService.hash(password);
      const isValid = await PasswordService.verify(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    test('should reject empty password', async () => {
      const password = 'testPassword123';
      const hash = await PasswordService.hash(password);
      const isValid = await PasswordService.verify('', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('should accept valid password', () => {
      const result = PasswordService.validatePassword('validPass123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject empty password', () => {
      const result = PasswordService.validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    test('should reject short password', () => {
      const result = PasswordService.validatePassword('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be at least 6 characters long');
    });

    test('should reject too long password', () => {
      const longPassword = 'a'.repeat(129);
      const result = PasswordService.validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be less than 128 characters');
    });

    test('should accept minimum length password', () => {
      const result = PasswordService.validatePassword('123456');
      expect(result.valid).toBe(true);
    });

    test('should accept maximum length password', () => {
      const maxPassword = 'a'.repeat(128);
      const result = PasswordService.validatePassword(maxPassword);
      expect(result.valid).toBe(true);
    });
  });

  describe('generateRandomPassword', () => {
    test('should generate password with default length', () => {
      const password = PasswordService.generateRandomPassword();
      expect(password.length).toBe(12);
    });

    test('should generate password with custom length', () => {
      const password = PasswordService.generateRandomPassword(20);
      expect(password.length).toBe(20);
    });

    test('should generate different passwords', () => {
      const password1 = PasswordService.generateRandomPassword();
      const password2 = PasswordService.generateRandomPassword();
      expect(password1).not.toBe(password2);
    });

    test('should generate password with valid characters', () => {
      const password = PasswordService.generateRandomPassword();
      const validChars = /^[a-zA-Z0-9!@#$%^&*]+$/;
      expect(validChars.test(password)).toBe(true);
    });
  });
});

