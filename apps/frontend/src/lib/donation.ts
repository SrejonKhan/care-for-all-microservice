// Donation API client for CareForAll frontend

export interface Donation {
  id: string;
  campaignId: string;
  donorId?: string;
  donorName?: string;
  donorEmail?: string;
  amount: number;
  status: 'PENDING' | 'BALANCE_CHECK' | 'AUTHORIZED' | 'CAPTURED' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  isAnonymous: boolean;
  isGuest: boolean;
  bankAccountId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDonationRequest {
  campaignId: string;
  amount: number;
  donorName?: string;
  donorEmail?: string;
  isAnonymous?: boolean;
  bankAccountId?: string;
}

export interface DonationResponse {
  success: boolean;
  data?: Donation;
  error?: {
    code: string;
    message: string;
  };
}

class DonationService {
  private baseUrl = 'http://localhost:8080/api/campaigns';

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

  async createDonation(data: CreateDonationRequest): Promise<DonationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      return result;
    } catch (error) {
      console.error('Create donation error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  // Helper method to format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Helper to get status badge color
  getStatusColor(status: Donation['status']): string {
    switch (status) {
      case 'COMPLETED': return 'green';
      case 'PENDING': return 'yellow';
      case 'FAILED': return 'red';
      case 'REFUNDED': return 'gray';
      default: return 'blue';
    }
  }
}

// Helper function to generate a mock bank account ID for demo purposes
export function generateMockBankAccountId(): string {
  // Return a random mock bank account from the available test accounts
  const mockAccounts = [
    'bank_acc_guest',
    'bank_acc_001',
    'bank_acc_002',
    'bank_acc_003',
  ];
  return mockAccounts[Math.floor(Math.random() * mockAccounts.length)];
}

export const donationService = new DonationService();
