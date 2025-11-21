import { z } from 'zod';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const RegisterRequestSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const LoginRequestSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const GuestRequestSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const RefreshRequestSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ClaimGuestRequestSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const VerifyTokenRequestSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email().nullable(),
    name: z.string(),
    role: z.enum(['USER', 'CAMPAIGN_OWNER', 'ADMIN']),
    isGuest: z.boolean(),
    emailVerified: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const TokenPairSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
});

export const AuthResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        user: UserSchema,
        tokens: TokenPairSchema,
    }).optional(),
    error: z.object({
        code: z.string(),
        message: z.string(),
    }).optional(),
});

export const VerifyTokenResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        userId: z.string().uuid(),
        email: z.string().email().nullable(),
        role: z.enum(['USER', 'CAMPAIGN_OWNER', 'ADMIN']),
        isGuest: z.boolean(),
    }).optional(),
    error: z.object({
        code: z.string(),
        message: z.string(),
    }).optional(),
});

export const MessageResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        message: z.string(),
    }).optional(),
    error: z.object({
        code: z.string(),
        message: z.string(),
    }).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type GuestRequest = z.infer<typeof GuestRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type ClaimGuestRequest = z.infer<typeof ClaimGuestRequestSchema>;
export type VerifyTokenRequest = z.infer<typeof VerifyTokenRequestSchema>;

