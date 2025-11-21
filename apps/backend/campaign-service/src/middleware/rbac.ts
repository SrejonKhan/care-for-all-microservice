import { Context, Next } from 'hono';
import { AccessTokenPayload } from './auth';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: 'info',
});

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Middleware to check if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AccessTokenPayload;

    if (!user) {
      logger.warn('RBAC check failed: No user in context');
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn('RBAC check failed: Insufficient permissions', {
        userId: user.userId,
        userRole: user.role,
        requiredRoles: allowedRoles,
      });
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        },
        403
      );
    }

    logger.debug('RBAC check passed', {
      userId: user.userId,
      role: user.role,
    });

    await next();
  };
}

/**
 * Check if user is admin
 */
export function requireAdmin() {
  return requireRole('ADMIN');
}

/**
 * Check if user is campaign owner or admin
 */
export function requireCampaignOwnerOrAdmin() {
  return requireRole('CAMPAIGN_OWNER', 'ADMIN');
}

