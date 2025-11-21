import { PaymentStatus, PaymentProvider } from '../models';

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

export interface PaymentAuthorizedEvent {
  paymentId: string;
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  providerTransactionId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PaymentCapturedEvent {
  paymentId: string;
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  providerTransactionId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PaymentCompletedEvent {
  paymentId: string;
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  providerTransactionId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PaymentFailedEvent {
  paymentId: string;
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  reason: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PaymentRefundedEvent {
  paymentId: string;
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  reason: string;
  refundId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export const PAYMENT_EVENT_TYPES = {
  AUTHORIZED: 'payment.authorized',
  CAPTURED: 'payment.captured',
  COMPLETED: 'payment.completed',
  FAILED: 'payment.failed',
  REFUNDED: 'payment.refunded',
} as const;

// ============================================================================
// ROUTING KEYS
// ============================================================================

export const PAYMENT_ROUTING_KEYS = {
  AUTHORIZED: 'payment.authorized',
  CAPTURED: 'payment.captured',
  COMPLETED: 'payment.completed',
  FAILED: 'payment.failed',
  REFUNDED: 'payment.refunded',
} as const;

