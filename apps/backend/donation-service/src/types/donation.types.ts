import { DonationStatus } from '../models/donation.model';

// ============================================================================
// DONATION TYPES
// ============================================================================

export interface CreateDonationInput {
  campaignId: string;
  amount: number;
  donorId?: string;
  donorName?: string;
  donorEmail?: string;
  isAnonymous?: boolean;
  isGuest?: boolean;
  bankAccountId?: string;
}

export interface UpdateDonationInput {
  status?: DonationStatus;
  failureReason?: string;
  refundReason?: string;
  authorizedAt?: Date;
  capturedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
}

export interface DonationFilter {
  campaignId?: string;
  donorId?: string;
  status?: DonationStatus;
  isGuest?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface DonationListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

