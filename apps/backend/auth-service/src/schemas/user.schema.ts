import { z } from 'zod';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const UpdateProfileRequestSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
});

export const UpdateRoleRequestSchema = z.object({
    role: z.enum(['USER', 'CAMPAIGN_OWNER', 'ADMIN'] as const),
});

export const ListUsersQuerySchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
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

export const UserResponseSchema = z.object({
    success: z.boolean(),
    data: UserSchema.optional(),
    error: z.object({
        code: z.string(),
        message: z.string(),
    }).optional(),
});

export const UsersListResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        users: z.array(UserSchema),
        total: z.number(),
        page: z.number(),
        totalPages: z.number(),
    }).optional(),
    error: z.object({
        code: z.string(),
        message: z.string(),
    }).optional(),
});

export const UserStatsResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        totalUsers: z.number(),
        totalGuests: z.number(),
        totalRegistered: z.number(),
        usersByRole: z.object({
            USER: z.number(),
            CAMPAIGN_OWNER: z.number(),
            ADMIN: z.number(),
        }),
    }).optional(),
    error: z.object({
        code: z.string(),
        message: z.string(),
    }).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>;
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

