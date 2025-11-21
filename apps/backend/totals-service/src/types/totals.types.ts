// ============================================================================
// TOTALS TYPES
// ============================================================================

export interface CampaignTotalsResponse {
  campaignId: string;
  totalAmount: number;
  totalPledges: number;
  totalDonors: number;
  lastUpdated: string;
}

export interface ListCampaignTotalsQuery {
  limit?: number;
  offset?: number;
  sortBy?: 'totalAmount' | 'totalPledges' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

export interface ListCampaignTotalsResponse {
  totals: CampaignTotalsResponse[];
  total: number;
  limit: number;
  offset: number;
}

