// ============================================================================
// DONATION EVENTS
// ============================================================================

export interface DonationCreatedPayload {
  donationId: string;
  campaignId: string;
  amount: number;
  donorId?: string;
  donorName?: string;
  isAnonymous: boolean;
  isGuest: boolean;
  timestamp: string;
}

export interface DonationRefundedPayload {
  donationId: string;
  campaignId: string;
  amount: number;
  reason: string;
  timestamp: string;
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

export interface PaymentCompletedPayload {
  paymentId: string;
  donationId: string;
  amount: number;
  provider: string;
  providerTransactionId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PaymentRefundedPayload {
  paymentId: string;
  donationId: string;
  amount: number;
  provider: string;
  reason: string;
  refundId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// EVENT WRAPPERS
// ============================================================================

export interface DonationCreatedEvent {
  eventId: string;
  eventType: 'donation.created';
  payload: DonationCreatedPayload;
  timestamp: string;
  version: string;
}

export interface DonationRefundedEvent {
  eventId: string;
  eventType: 'donation.refunded';
  payload: DonationRefundedPayload;
  timestamp: string;
  version: string;
}

export interface PaymentCompletedEvent {
  eventId: string;
  eventType: 'payment.completed';
  payload: PaymentCompletedPayload;
  timestamp: string;
  version: string;
}

export interface PaymentRefundedEvent {
  eventId: string;
  eventType: 'payment.refunded';
  payload: PaymentRefundedPayload;
  timestamp: string;
  version: string;
}

export type TotalsEvent =
  | DonationCreatedEvent
  | DonationRefundedEvent
  | PaymentCompletedEvent
  | PaymentRefundedEvent;

