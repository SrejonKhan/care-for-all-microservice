// Authentication utilities for CareForAll frontend

export interface User {
  id: string;
  email: string | null;
  name: string;
  role: 'USER' | 'CAMPAIGN_OWNER' | 'ADMIN';
  isGuest: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    tokens: AuthTokens;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface GuestRequest {
  name: string;
}

class AuthService {
  private baseUrl = process.env.NODE_ENV === 'production' 
    ? 'http://localhost:8080/api/auth' 
    : 'http://localhost:8080/api/auth';

  // Store tokens in localStorage
  private getStoredTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('careforall_auth_tokens');
    return stored ? JSON.parse(stored) : null;
  }

  private setStoredTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('careforall_auth_tokens', JSON.stringify(tokens));
  }

  private removeStoredTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('careforall_auth_tokens');
  }

  // Store user data
  private getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('careforall_auth_user');
    return stored ? JSON.parse(stored) : null;
  }

  private setStoredUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('careforall_auth_user', JSON.stringify(user));
  }

  private removeStoredUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('careforall_auth_user');
  }

  // API calls
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: AuthResponse = await response.json();
      
      if (result.success && result.data) {
        this.setStoredTokens(result.data.tokens);
        this.setStoredUser(result.data.user);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: AuthResponse = await response.json();
      
      if (result.success && result.data) {
        this.setStoredTokens(result.data.tokens);
        this.setStoredUser(result.data.user);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  async createGuest(data: GuestRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: AuthResponse = await response.json();
      
      if (result.success && result.data) {
        this.setStoredTokens(result.data.tokens);
        this.setStoredUser(result.data.user);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server',
        },
      };
    }
  }

  async logout(): Promise<void> {
    const tokens = this.getStoredTokens();
    
    if (tokens) {
      try {
        await fetch(`${this.baseUrl}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.removeStoredTokens();
    this.removeStoredUser();
  }

  async refreshToken(): Promise<boolean> {
    const tokens = this.getStoredTokens();
    
    if (!tokens) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      const result: AuthResponse = await response.json();
      
      if (result.success && result.data) {
        this.setStoredTokens(result.data.tokens);
        this.setStoredUser(result.data.user);
        return true;
      }
      
      // Refresh failed, clear stored data
      this.removeStoredTokens();
      this.removeStoredUser();
      return false;
    } catch (error) {
      this.removeStoredTokens();
      this.removeStoredUser();
      return false;
    }
  }

  // Get current authentication state
  getCurrentUser(): User | null {
    return this.getStoredUser();
  }

  getCurrentTokens(): AuthTokens | null {
    return this.getStoredTokens();
  }

  isAuthenticated(): boolean {
    const user = this.getStoredUser();
    const tokens = this.getStoredTokens();
    return !!(user && tokens);
  }

  isGuest(): boolean {
    const user = this.getStoredUser();
    return user?.isGuest ?? false;
  }

  isAdmin(): boolean {
    const user = this.getStoredUser();
    return user?.role === 'ADMIN';
  }

  isCampaignOwner(): boolean {
    const user = this.getStoredUser();
    return user?.role === 'CAMPAIGN_OWNER';
  }

  hasAdminAccess(): boolean {
    return this.isAdmin() || this.isCampaignOwner();
  }

  // Get authorization header for API calls
  getAuthHeaders(): Record<string, string> {
    const tokens = this.getStoredTokens();
    
    if (tokens) {
      return {
        'Authorization': `Bearer ${tokens.accessToken}`,
      };
    }
    
    return {};
  }
}

export const authService = new AuthService();
