import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

// ============================================================================
// CAMPAIGN CLIENT SERVICE
// ============================================================================

export class CampaignClientService {
  private static campaignServiceUrl =
    process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:3002';

  /**
   * Verify that a campaign exists and is active
   */
  static async verifyCampaign(campaignId: string): Promise<{
    exists: boolean;
    isActive: boolean;
    error?: string;
  }> {
    try {
      logger.info('Verifying campaign', { campaignId });

      const response = await fetch(
        `${this.campaignServiceUrl}/api/campaigns/${campaignId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('Campaign not found', { campaignId });
          return {
            exists: false,
            isActive: false,
            error: 'Campaign not found',
          };
        }

        logger.error('Error fetching campaign', {
          campaignId,
          status: response.status,
        });

        return {
          exists: false,
          isActive: false,
          error: 'Failed to verify campaign',
        };
      }

      const data = await response.json();
      const campaign = data.data;

      logger.info('Campaign verified', {
        campaignId,
        status: campaign.status,
      });

      return {
        exists: true,
        isActive: campaign.status === 'ACTIVE',
      };
    } catch (error) {
      logger.error('Error verifying campaign', {
        campaignId,
        error: (error as Error).message,
      });

      return {
        exists: false,
        isActive: false,
        error: 'Failed to connect to campaign service',
      };
    }
  }

  /**
   * Get campaign details
   */
  static async getCampaign(campaignId: string): Promise<any | null> {
    try {
      logger.info('Getting campaign details', { campaignId });

      const response = await fetch(
        `${this.campaignServiceUrl}/api/campaigns/${campaignId}`
      );

      if (!response.ok) {
        logger.warn('Campaign not found', { campaignId, status: response.status });
        return null;
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      logger.error('Error getting campaign', {
        campaignId,
        error: (error as Error).message,
      });
      return null;
    }
  }
}

