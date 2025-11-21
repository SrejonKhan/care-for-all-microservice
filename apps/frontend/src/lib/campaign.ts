// Campaign API client for CareForAll frontend

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  ownerId: string;
  startDate: string;
  endDate: string;
  category?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  title: string;
  description: string;
  goalAmount: number;
  startDate: string;
  endDate: string;
  category?: string;
  imageUrl?: string;
}

export interface UpdateCampaignRequest {
  title?: string;
  description?: string;
  goalAmount?: number;
  status?: Campaign['status'];
  endDate?: string;
  category?: string;
  imageUrl?: string;
}

export interface CampaignListParams {
  page?: number;
  pageSize?: number;
  status?: Campaign['status'];
  ownerId?: string;
  category?: string;
}

export interface PaginatedCampaignsResponse {
  success: boolean;
  data?: {
    campaigns: Campaign[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CampaignResponse {
  success: boolean;
  data?: Campaign;
  error?: {
    code: string;
    message: string;
  };
}

class CampaignService {
  private baseUrl = process.env.NODE_ENV === 'production' 
    ? 'http://localhost:8080/api/campaigns' 
    : 'http://localhost:8080/api/campaigns';

  // Get authorization headers from auth service
  private getAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    
    const tokens = localStorage.getItem('careforall_auth_tokens');
    if (tokens) {
      const parsedTokens = JSON.parse(tokens);
      return {
        'Authorization': `Bearer ${parsedTokens.accessToken}`,
      };
    }
    
    return {};
  }

  async listCampaigns(params: CampaignListParams = {}): Promise<PaginatedCampaignsResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
      if (params.status) searchParams.append('status', params.status);
      if (params.ownerId) searchParams.append('ownerId', params.ownerId);
      if (params.category) searchParams.append('category', params.category);

      // Use direct backend connection on port 4001
      const url = `http://localhost:4001/campaigns${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: {
            campaigns: result.data.items,
            pagination: {
              currentPage: result.data.page,
              totalPages: result.data.totalPages,
              totalItems: result.data.total,
              itemsPerPage: result.data.pageSize,
              hasNextPage: result.data.page < result.data.totalPages,
              hasPreviousPage: result.data.page > 1,
            },
          },
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('List campaigns error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  async getCampaign(id: string): Promise<CampaignResponse> {
    try {
      const response = await fetch(`http://localhost:4001/campaigns/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('Get campaign error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  async createCampaign(data: CreateCampaignRequest): Promise<CampaignResponse> {
    try {
      // Use the regular campaigns endpoint (no auth required)
      const response = await fetch(`http://localhost:4001/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('Create campaign error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  async updateCampaign(id: string, data: UpdateCampaignRequest): Promise<CampaignResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Update campaign error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  async deleteCampaign(id: string): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      return await response.json();
    } catch (error) {
      console.error('Delete campaign error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  // Helper method to calculate progress percentage
  calculateProgress(campaign: Campaign): number {
    if (campaign.goalAmount <= 0) return 0;
    return Math.min(100, Math.round((campaign.currentAmount / campaign.goalAmount) * 100));
  }

  // Helper method to format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Helper method to format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Helper method to get status color
  getStatusColor(status: Campaign['status']): string {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'DRAFT': return 'gray';
      case 'PAUSED': return 'yellow';
      case 'COMPLETED': return 'blue';
      case 'CANCELLED': return 'red';
      default: return 'gray';
    }
  }
}

export const campaignService = new CampaignService();
