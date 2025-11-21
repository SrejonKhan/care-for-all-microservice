import { PaymentProvider } from '../models';
import {
  ProviderAuthorizationResult,
  ProviderCaptureResult,
  ProviderRefundResult,
} from '../types/payment.types';

// ============================================================================
// PAYMENT PROVIDER INTERFACE
// ============================================================================

export interface IPaymentProvider {
  /**
   * Authorize a payment (hold funds)
   */
  authorize(params: {
    amount: number;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
  }): Promise<ProviderAuthorizationResult>;

  /**
   * Capture an authorized payment (charge funds)
   */
  capture(params: {
    transactionId: string;
    amount?: number; // Optional partial capture
  }): Promise<ProviderCaptureResult>;

  /**
   * Refund a captured payment
   */
  refund(params: {
    transactionId: string;
    amount?: number; // Optional partial refund
    reason: string;
  }): Promise<ProviderRefundResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(params: {
    payload: string;
    signature: string;
    secret: string;
  }): Promise<boolean>;
}

// ============================================================================
// PAYMENT PROVIDER FACTORY
// ============================================================================

export class PaymentProviderFactory {
  static getProvider(provider: PaymentProvider): IPaymentProvider {
    switch (provider) {
      case PaymentProvider.MOCK:
        return new MockPaymentProvider();
      case PaymentProvider.STRIPE:
        // TODO: Implement Stripe provider
        throw new Error('Stripe provider not yet implemented');
      case PaymentProvider.PAYPAL:
        // TODO: Implement PayPal provider
        throw new Error('PayPal provider not yet implemented');
      default:
        throw new Error(`Unknown payment provider: ${provider}`);
    }
  }
}

// ============================================================================
// MOCK PAYMENT PROVIDER
// ============================================================================

export class MockPaymentProvider implements IPaymentProvider {
  /**
   * Authorize a payment (mock implementation)
   */
  async authorize(params: {
    amount: number;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
  }): Promise<ProviderAuthorizationResult> {
    // Simulate API delay
    await this.delay(100);

    // Simulate different scenarios based on payment method ID
    if (params.paymentMethodId === 'pm_fail') {
      return {
        success: false,
        errorMessage: 'Card declined',
      };
    }

    if (params.paymentMethodId === 'pm_insufficient_funds') {
      return {
        success: false,
        errorMessage: 'Insufficient funds',
      };
    }

    // Success case
    return {
      success: true,
      transactionId: `mock_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        ...params.metadata,
        mockProvider: true,
        authorizedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Capture an authorized payment (mock implementation)
   */
  async capture(params: {
    transactionId: string;
    amount?: number;
  }): Promise<ProviderCaptureResult> {
    // Simulate API delay
    await this.delay(100);

    // Simulate failure for specific transaction IDs
    if (params.transactionId.includes('fail')) {
      return {
        success: false,
        errorMessage: 'Capture failed',
      };
    }

    // Success case
    return {
      success: true,
      transactionId: params.transactionId,
      metadata: {
        capturedAmount: params.amount,
        capturedAt: new Date().toISOString(),
        mockProvider: true,
      },
    };
  }

  /**
   * Refund a captured payment (mock implementation)
   */
  async refund(params: {
    transactionId: string;
    amount?: number;
    reason: string;
  }): Promise<ProviderRefundResult> {
    // Simulate API delay
    await this.delay(100);

    // Simulate failure for specific transaction IDs
    if (params.transactionId.includes('fail')) {
      return {
        success: false,
        errorMessage: 'Refund failed',
      };
    }

    // Success case
    return {
      success: true,
      refundId: `mock_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        refundedAmount: params.amount,
        refundReason: params.reason,
        refundedAt: new Date().toISOString(),
        mockProvider: true,
      },
    };
  }

  /**
   * Verify webhook signature (mock implementation)
   */
  async verifyWebhookSignature(params: {
    payload: string;
    signature: string;
    secret: string;
  }): Promise<boolean> {
    // For mock provider, always return true
    // In real implementation, verify HMAC signature
    return true;
  }

  /**
   * Simulate API delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

