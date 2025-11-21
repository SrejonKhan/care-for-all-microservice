import { PaymentStatus, PaymentProvider } from '../models';

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface CreatePaymentInput {
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  idempotencyKey: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentInput {
  status?: PaymentStatus;
  providerTransactionId?: string;
  failureReason?: string;
  refundReason?: string;
  metadata?: Record<string, any>;
}

export interface AuthorizePaymentInput {
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  paymentMethodId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface CapturePaymentInput {
  paymentId: string;
  amount?: number; // Optional partial capture
}

export interface RefundPaymentInput {
  paymentId: string;
  amount?: number; // Optional partial refund
  reason: string;
}

export interface PaymentResponse {
  id: string;
  paymentId: string;
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerTransactionId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
  authorizedAt?: string;
  capturedAt?: string;
  completedAt?: string;
  failedAt?: string;
  refundedAt?: string;
  failureReason?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListPaymentsQuery {
  donationId?: string;
  provider?: PaymentProvider;
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
}

// ============================================================================
// IDEMPOTENCY TYPES
// ============================================================================

export interface IdempotencyRecord {
  key: string;
  response: any;
  createdAt: Date;
  expiresAt: Date;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface WebhookPayload {
  provider: PaymentProvider;
  eventType: string;
  eventId: string;
  signature?: string;
  data: Record<string, any>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export interface ProviderAuthorizationResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ProviderCaptureResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ProviderRefundResult {
  success: boolean;
  refundId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

