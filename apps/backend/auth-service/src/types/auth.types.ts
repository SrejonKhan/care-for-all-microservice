import { UserRole } from '../models/user.model';

// ============================================================================
// JWT PAYLOAD TYPES
// ============================================================================

export interface AccessTokenPayload {
    userId: string;
    email: string | null;
    role: UserRole;
    isGuest: boolean;
}

export interface RefreshTokenPayload {
    userId: string;
    tokenId: string;
}

// ============================================================================
// TOKEN RESPONSE TYPES
// ============================================================================

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds until access token expires
}

// ============================================================================
// USER TYPES (without sensitive data)
// ============================================================================

export interface SafeUser {
    id: string;
    email: string | null;
    name: string;
    role: UserRole;
    isGuest: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// AUTH RESPONSE TYPES
// ============================================================================

export interface AuthResponse {
    user: SafeUser;
    tokens: TokenPair;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AuthError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 401
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

export class ValidationError extends Error {
    constructor(
        message: string,
        public code: string = 'VALIDATION_ERROR',
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

// Re-export UserRole for convenience
export { UserRole };
