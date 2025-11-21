import { CampaignStatus } from '../models/campaign.model';

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

export interface CreateCampaignInput {
  title: string;
  description: string;
  goalAmount: number;
  startDate: Date;
  endDate: Date;
  category?: string;
  imageUrl?: string;
}

export interface UpdateCampaignInput {
  title?: string;
  description?: string;
  goalAmount?: number;
  status?: CampaignStatus;
  endDate?: Date;
  category?: string;
  imageUrl?: string;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  ownerId?: string;
  category?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class CampaignError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CampaignError';
  }
}

