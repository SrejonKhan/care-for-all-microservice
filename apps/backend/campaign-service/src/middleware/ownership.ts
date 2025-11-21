import { Context, Next } from 'hono';
import { AccessTokenPayload } from './auth';
import { CampaignService } from '../services/campaign.service';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: 'info',
});

// ============================================================================
// OWNERSHIP MIDDLEWARE
// ============================================================================

/**
 * Middleware to verify campaign ownership
 * Allows access if user is the campaign owner or an admin
 */
export async function verifyCampaignOwnership(c: Context, next: Next) {
  const user = c.get('user') as AccessTokenPayload;
  const campaignId = c.req.param('id');

  if (!user) {
    logger.warn('Ownership check failed: No user in context');
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

  if (!campaignId) {
    logger.warn('Ownership check failed: No campaign ID in params');
    return c.json(
      {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Campaign ID is required',
        },
      },
      400
    );
  }

  // Admins can access any campaign
  if (user.role === 'ADMIN') {
    logger.debug('Ownership check passed: User is admin', {
      userId: user.userId,
      campaignId,
    });
    await next();
    return;
  }

  // Check if user owns the campaign
  try {
    const isOwner = await CampaignService.isOwner(campaignId, user.userId);

    if (!isOwner) {
      logger.warn('Ownership check failed: User is not owner', {
        userId: user.userId,
        campaignId,
      });
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this campaign',
          },
        },
        403
      );
    }

    logger.debug('Ownership check passed', {
      userId: user.userId,
      campaignId,
    });

    await next();
  } catch (error) {
    logger.error('Error checking campaign ownership', {
      userId: user.userId,
      campaignId,
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify campaign ownership',
        },
      },
      500
    );
  }
}

