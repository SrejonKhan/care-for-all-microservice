import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: 'info',
});

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';

// ============================================================================
// AUTH CLIENT SERVICE
// ============================================================================

export class AuthClientService {
  /**
   * Elevate user role to CAMPAIGN_OWNER
   */
  static async elevateUserToCampaignOwner(
    userId: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          role: 'CAMPAIGN_OWNER',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to elevate user role', {
          userId,
          status: response.status,
          error: errorData,
        });
        return false;
      }

      logger.info('User role elevated to CAMPAIGN_OWNER', { userId });
      return true;
    } catch (error) {
      logger.error('Error calling Auth Service to elevate user role', {
        userId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Get user details from Auth Service
   */
  static async getUserDetails(
    userId: string,
    accessToken: string
  ): Promise<any | null> {
    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/users/${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        logger.error('Failed to get user details', {
          userId,
          status: response.status,
        });
        return null;
      }

      const data = await response.json() as any;
      return data.data as User | null;
    } catch (error) {
      logger.error('Error calling Auth Service to get user details', {
        userId,
        error: (error as Error).message,
      });
      return null;
    }
  }
}

