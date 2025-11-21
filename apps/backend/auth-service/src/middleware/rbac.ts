import { Context, Next } from 'hono';
import { UserRole } from '../models/user.model';
import { requireUser } from './auth';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
    serviceName: 'auth-service',
    minLevel: 'info',
});

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

const ROLE_HIERARCHY: Record<UserRole, number> = {
    USER: 1,
    CAMPAIGN_OWNER: 2,
    ADMIN: 3,
};

// ============================================================================
// RBAC MIDDLEWARE
// ============================================================================

/**
 * Middleware to check if user has required role
 * @param requiredRole Minimum required role
 * @returns Middleware function
 */
export function requireRole(requiredRole: UserRole) {
    return async (c: Context, next: Next) => {
        try {
            const user = requireUser(c);

            // Check if user has required role or higher
            const userRoleLevel = ROLE_HIERARCHY[user.role];
            const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

            if (userRoleLevel < requiredRoleLevel) {
                logger.warn('Insufficient permissions', {
                    userId: user.userId,
                    userRole: user.role,
                    requiredRole,
                });

                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'INSUFFICIENT_PERMISSIONS',
                            message: `This action requires ${requiredRole} role or higher`,
                        },
                    },
                    403
                );
            }

            logger.debug('Role check passed', {
                userId: user.userId,
                role: user.role,
                requiredRole,
            });

            await next();
        } catch (error) {
            logger.error('Error in role middleware', error);
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'An unexpected error occurred',
                    },
                },
                500
            );
        }
    };
}

/**
 * Middleware to check if user has exact role
 * @param role Required role
 * @returns Middleware function
 */
export function requireExactRole(role: UserRole) {
    return async (c: Context, next: Next) => {
        try {
            const user = requireUser(c);

            if (user.role !== role) {
                logger.warn('Exact role check failed', {
                    userId: user.userId,
                    userRole: user.role,
                    requiredRole: role,
                });

                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'INSUFFICIENT_PERMISSIONS',
                            message: `This action requires ${role} role`,
                        },
                    },
                    403
                );
            }

            await next();
        } catch (error) {
            logger.error('Error in exact role middleware', error);
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'An unexpected error occurred',
                    },
                },
                500
            );
        }
    };
}

/**
 * Middleware to check if user has any of the specified roles
 * @param roles Array of allowed roles
 * @returns Middleware function
 */
export function requireAnyRole(roles: UserRole[]) {
    return async (c: Context, next: Next) => {
        try {
            const user = requireUser(c);

            if (!roles.includes(user.role)) {
                logger.warn('Role not in allowed list', {
                    userId: user.userId,
                    userRole: user.role,
                    allowedRoles: roles,
                });

                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'INSUFFICIENT_PERMISSIONS',
                            message: `This action requires one of the following roles: ${roles.join(', ')}`,
                        },
                    },
                    403
                );
            }

            await next();
        } catch (error) {
            logger.error('Error in any role middleware', error);
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'An unexpected error occurred',
                    },
                },
                500
            );
        }
    };
}

/**
 * Middleware to prevent guest users from accessing endpoint
 */
export function requireRegisteredUser() {
    return async (c: Context, next: Next) => {
        try {
            const user = requireUser(c);

            if (user.isGuest) {
                logger.warn('Guest user attempted to access registered-only endpoint', {
                    userId: user.userId,
                });

                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'GUEST_NOT_ALLOWED',
                            message: 'This action is not available for guest users. Please register an account.',
                        },
                    },
                    403
                );
            }

            await next();
        } catch (error) {
            logger.error('Error in registered user middleware', error);
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'An unexpected error occurred',
                    },
                },
                500
            );
        }
    };
}

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Middleware to check if user is campaign owner or admin
 */
export const requireCampaignOwner = requireRole(UserRole.CAMPAIGN_OWNER);

/**
 * Helper function to check if user has permission
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Helper function to check if user is owner of resource or admin
 */
export function isOwnerOrAdmin(userId: string, resourceOwnerId: string, userRole: UserRole): boolean {
    return userId === resourceOwnerId || userRole === UserRole.ADMIN;
}

