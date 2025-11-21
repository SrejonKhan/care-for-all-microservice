import { DonationStatus } from '../models/donation.model';

// ============================================================================
// BASE EVENT
// ============================================================================

export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  payload: unknown;
}

// ============================================================================
// DONATION EVENTS (Published)
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

export interface DonationCompletedPayload {
  donationId: string;
  campaignId: string;
  amount: number;
  donorId?: string;
  timestamp: string;
}

export interface DonationFailedPayload {
  donationId: string;
  campaignId: string;
  amount: number;
  reason: string;
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
// EVENT WRAPPERS
// ============================================================================

export interface DonationCreatedEvent extends BaseEvent {
  eventType: 'donation.created';
  payload: DonationCreatedPayload;
}

export interface DonationCompletedEvent extends BaseEvent {
  eventType: 'donation.completed';
  payload: DonationCompletedPayload;
}

export interface DonationFailedEvent extends BaseEvent {
  eventType: 'donation.failed';
  payload: DonationFailedPayload;
}

export interface DonationRefundedEvent extends BaseEvent {
  eventType: 'donation.refunded';
  payload: DonationRefundedPayload;
}

export type DonationEvent =
  | DonationCreatedEvent
  | DonationCompletedEvent
  | DonationFailedEvent
  | DonationRefundedEvent;

