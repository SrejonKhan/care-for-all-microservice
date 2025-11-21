import { CampaignStatus } from '../models/campaign.model';

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
// CAMPAIGN EVENTS (Published)
// ============================================================================

export interface CampaignCreatedPayload {
  campaignId: string;
  title: string;
  description: string;
  goalAmount: number;
  ownerId: string;
  startDate: string;
  endDate: string;
  category?: string;
}

export interface CampaignUpdatedPayload {
  campaignId: string;
  updates: {
    title?: string;
    description?: string;
    goalAmount?: number;
    endDate?: string;
    category?: string;
    imageUrl?: string;
  };
}

export interface CampaignStatusChangedPayload {
  campaignId: string;
  oldStatus: CampaignStatus;
  newStatus: CampaignStatus;
  changedBy: string;
}

// ============================================================================
// DONATION EVENTS (Consumed)
// ============================================================================

export interface DonationCreatedPayload {
  donationId: string;
  campaignId: string;
  amount: number;
  donorId?: string;
  donorName?: string;
  isAnonymous: boolean;
  timestamp: string;
}

export interface DonationCompletedPayload {
  donationId: string;
  campaignId: string;
  amount: number;
  paymentId: string;
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

export interface CampaignCreatedEvent extends BaseEvent {
  eventType: 'campaign.created';
  payload: CampaignCreatedPayload;
}

export interface CampaignUpdatedEvent extends BaseEvent {
  eventType: 'campaign.updated';
  payload: CampaignUpdatedPayload;
}

export interface CampaignStatusChangedEvent extends BaseEvent {
  eventType: 'campaign.status_changed';
  payload: CampaignStatusChangedPayload;
}

export interface DonationCreatedEvent extends BaseEvent {
  eventType: 'donation.created';
  payload: DonationCreatedPayload;
}

export interface DonationCompletedEvent extends BaseEvent {
  eventType: 'donation.completed';
  payload: DonationCompletedPayload;
}

export interface DonationRefundedEvent extends BaseEvent {
  eventType: 'donation.refunded';
  payload: DonationRefundedPayload;
}

export type CampaignEvent =
  | CampaignCreatedEvent
  | CampaignUpdatedEvent
  | CampaignStatusChangedEvent;

export type DonationEvent =
  | DonationCreatedEvent
  | DonationCompletedEvent
  | DonationRefundedEvent;

