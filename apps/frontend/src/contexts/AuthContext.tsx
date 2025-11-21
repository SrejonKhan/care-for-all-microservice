'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User, AuthResponse, LoginRequest, RegisterRequest, GuestRequest } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  isCampaignOwner: boolean;
  hasAdminAccess: boolean;
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  createGuest: (data: GuestRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const currentUser = authService.getCurrentUser();
      const tokens = authService.getCurrentTokens();

      if (currentUser && tokens) {
        // Try to refresh token to verify it's still valid
        const refreshSuccess = await authService.refreshToken();
        
        if (refreshSuccess) {
          setUser(authService.getCurrentUser());
        } else {
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    setIsLoading(true);
    
    try {
      const response = await authService.login(data);
      
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    setIsLoading(true);
    
    try {
      const response = await authService.register(data);
      
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const createGuest = async (data: GuestRequest): Promise<AuthResponse> => {
    setIsLoading(true);
    
    try {
      const response = await authService.createGuest(data);
      
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    const success = await authService.refreshToken();
    
    if (success) {
      setUser(authService.getCurrentUser());
    } else {
      setUser(null);
    }
    
    return success;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuest: user?.isGuest ?? false,
    isAdmin: user?.role === 'ADMIN',
    isCampaignOwner: user?.role === 'CAMPAIGN_OWNER',
    hasAdminAccess: !!(user && (user.role === 'ADMIN' || user.role === 'CAMPAIGN_OWNER')),
    login,
    register,
    createGuest,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
