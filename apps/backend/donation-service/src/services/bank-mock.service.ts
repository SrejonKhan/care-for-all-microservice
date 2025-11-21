import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

// ============================================================================
// MOCK BANK ACCOUNTS
// ============================================================================

// In-memory bank account balances for demonstration
// In a real system, this would call an external bank API
const mockBankAccounts = new Map<string, number>([
  // Default accounts with different balances
  ['bank_acc_001', 100000], // $1000.00
  ['bank_acc_002', 50000],  // $500.00
  ['bank_acc_003', 10000],  // $100.00
  ['bank_acc_004', 5000],   // $50.00
  ['bank_acc_005', 1000],   // $10.00
  ['bank_acc_006', 100],    // $1.00
  ['bank_acc_007', 0],      // $0.00 (insufficient)
  ['bank_acc_guest', 100000], // Default for guest users
]);

// ============================================================================
// BANK BALANCE CHECK RESULT
// ============================================================================

export interface BalanceCheckResult {
  success: boolean;
  hasSufficientBalance: boolean;
  currentBalance: number;
  requestedAmount: number;
  remainingBalance?: number;
  error?: string;
}

// ============================================================================
// BANK MOCK SERVICE
// ============================================================================

export class BankMockService {
  /**
   * Check if the bank account has sufficient balance
   */
  static async checkBalance(
    bankAccountId: string,
    amount: number
  ): Promise<BalanceCheckResult> {
    try {
      logger.info('Checking bank balance', { bankAccountId, amount });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get current balance
      const currentBalance = mockBankAccounts.get(bankAccountId);

      if (currentBalance === undefined) {
        logger.warn('Bank account not found', { bankAccountId });
        return {
          success: false,
          hasSufficientBalance: false,
          currentBalance: 0,
          requestedAmount: amount,
          error: 'Bank account not found',
        };
      }

      // Check if sufficient balance
      const hasSufficientBalance = currentBalance >= amount;

      if (hasSufficientBalance) {
        logger.info('Sufficient balance available', {
          bankAccountId,
          currentBalance,
          requestedAmount: amount,
        });

        return {
          success: true,
          hasSufficientBalance: true,
          currentBalance,
          requestedAmount: amount,
          remainingBalance: currentBalance - amount,
        };
      } else {
        logger.warn('Insufficient balance', {
          bankAccountId,
          currentBalance,
          requestedAmount: amount,
          shortfall: amount - currentBalance,
        });

        return {
          success: true,
          hasSufficientBalance: false,
          currentBalance,
          requestedAmount: amount,
          error: `Insufficient balance. Current: ${currentBalance}, Required: ${amount}`,
        };
      }
    } catch (error) {
      logger.error('Error checking bank balance', {
        bankAccountId,
        amount,
        error: (error as Error).message,
      });

      return {
        success: false,
        hasSufficientBalance: false,
        currentBalance: 0,
        requestedAmount: amount,
        error: 'Failed to check bank balance',
      };
    }
  }

  /**
   * Deduct amount from bank account (mock)
   */
  static async deductBalance(
    bankAccountId: string,
    amount: number
  ): Promise<boolean> {
    try {
      logger.info('Deducting from bank balance', { bankAccountId, amount });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      const currentBalance = mockBankAccounts.get(bankAccountId);

      if (currentBalance === undefined) {
        logger.error('Bank account not found for deduction', { bankAccountId });
        return false;
      }

      if (currentBalance < amount) {
        logger.error('Insufficient balance for deduction', {
          bankAccountId,
          currentBalance,
          amount,
        });
        return false;
      }

      // Deduct the amount
      mockBankAccounts.set(bankAccountId, currentBalance - amount);

      logger.info('Balance deducted successfully', {
        bankAccountId,
        amount,
        newBalance: currentBalance - amount,
      });

      return true;
    } catch (error) {
      logger.error('Error deducting bank balance', {
        bankAccountId,
        amount,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Refund amount to bank account (mock)
   */
  static async refundBalance(
    bankAccountId: string,
    amount: number
  ): Promise<boolean> {
    try {
      logger.info('Refunding to bank balance', { bankAccountId, amount });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      const currentBalance = mockBankAccounts.get(bankAccountId) || 0;

      // Add the amount back
      mockBankAccounts.set(bankAccountId, currentBalance + amount);

      logger.info('Balance refunded successfully', {
        bankAccountId,
        amount,
        newBalance: currentBalance + amount,
      });

      return true;
    } catch (error) {
      logger.error('Error refunding bank balance', {
        bankAccountId,
        amount,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Get current balance (for testing/admin purposes)
   */
  static async getBalance(bankAccountId: string): Promise<number | null> {
    const balance = mockBankAccounts.get(bankAccountId);
    return balance !== undefined ? balance : null;
  }

  /**
   * Set balance for a bank account (for testing purposes)
   */
  static setBalance(bankAccountId: string, amount: number): void {
    mockBankAccounts.set(bankAccountId, amount);
    logger.info('Bank balance set', { bankAccountId, amount });
  }

  /**
   * Get all mock accounts (for testing/demo purposes)
   */
  static getAllAccounts(): Map<string, number> {
    return new Map(mockBankAccounts);
  }

  /**
   * Generate a random bank account for demo purposes
   */
  static generateMockAccount(initialBalance: number = 100000): string {
    const accountId = `bank_acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    mockBankAccounts.set(accountId, initialBalance);
    logger.info('Generated mock bank account', { accountId, initialBalance });
    return accountId;
  }
}

