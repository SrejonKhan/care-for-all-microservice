import { describe, test, expect, beforeEach } from 'bun:test';
import { BankMockService } from '../src/services/bank-mock.service';

describe('BankMockService', () => {
  beforeEach(() => {
    // Reset balances for known accounts
    BankMockService.setBalance('bank_acc_001', 100000);
    BankMockService.setBalance('bank_acc_002', 50000);
    BankMockService.setBalance('bank_acc_007', 0);
  });

  describe('checkBalance', () => {
    test('should return success with sufficient balance', async () => {
      const result = await BankMockService.checkBalance('bank_acc_001', 50000);

      expect(result.success).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.currentBalance).toBe(100000);
      expect(result.requestedAmount).toBe(50000);
      expect(result.remainingBalance).toBe(50000);
    });

    test('should return insufficient balance', async () => {
      const result = await BankMockService.checkBalance('bank_acc_007', 1000);

      expect(result.success).toBe(true);
      expect(result.hasSufficientBalance).toBe(false);
      expect(result.currentBalance).toBe(0);
      expect(result.error).toBeDefined();
    });

    test('should return error for non-existent account', async () => {
      const result = await BankMockService.checkBalance('nonexistent', 1000);

      expect(result.success).toBe(false);
      expect(result.hasSufficientBalance).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('deductBalance', () => {
    test('should deduct balance successfully', async () => {
      const result = await BankMockService.deductBalance('bank_acc_001', 30000);

      expect(result).toBe(true);

      const newBalance = await BankMockService.getBalance('bank_acc_001');
      expect(newBalance).toBe(70000);
    });

    test('should fail to deduct with insufficient balance', async () => {
      const result = await BankMockService.deductBalance('bank_acc_007', 1000);

      expect(result).toBe(false);
    });

    test('should fail for non-existent account', async () => {
      const result = await BankMockService.deductBalance('nonexistent', 1000);

      expect(result).toBe(false);
    });
  });

  describe('refundBalance', () => {
    test('should refund balance successfully', async () => {
      const result = await BankMockService.refundBalance('bank_acc_002', 10000);

      expect(result).toBe(true);

      const newBalance = await BankMockService.getBalance('bank_acc_002');
      expect(newBalance).toBe(60000);
    });

    test('should create account if not exists during refund', async () => {
      const result = await BankMockService.refundBalance('new_account', 5000);

      expect(result).toBe(true);

      const newBalance = await BankMockService.getBalance('new_account');
      expect(newBalance).toBe(5000);
    });
  });

  describe('generateMockAccount', () => {
    test('should generate a new account with initial balance', () => {
      const accountId = BankMockService.generateMockAccount(25000);

      expect(accountId).toContain('bank_acc_');

      const balance = BankMockService.getBalance(accountId);
      expect(balance).resolves.toBe(25000);
    });
  });
});

