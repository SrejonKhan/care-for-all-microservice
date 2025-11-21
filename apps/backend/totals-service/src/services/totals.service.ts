import { CampaignTotals, ICampaignTotals } from '../models/campaign-totals.model';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'totals-service',
  minLevel: 'info',
});

// ============================================================================
// TOTALS SERVICE
// ============================================================================

export class TotalsService {
  /**
   * Get campaign totals by campaign ID
   */
  static async getCampaignTotals(campaignId: string): Promise<ICampaignTotals | null> {
    try {
      const totals = await CampaignTotals.findOne({ campaignId });

      if (!totals) {
        logger.debug('Campaign totals not found', { campaignId });
        return null;
      }

      return totals;
    } catch (error) {
      logger.error('Error getting campaign totals', {
        campaignId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get or create campaign totals (for initialization)
   */
  static async getOrCreateCampaignTotals(campaignId: string): Promise<ICampaignTotals> {
    try {
      let totals = await CampaignTotals.findOne({ campaignId });

      if (!totals) {
        totals = await CampaignTotals.create({
          campaignId,
          totalAmount: 0,
          totalPledges: 0,
          totalDonors: 0,
          lastUpdated: new Date(),
        });

        logger.info('Created new campaign totals', { campaignId });
      }

      return totals;
    } catch (error) {
      logger.error('Error getting or creating campaign totals', {
        campaignId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Increment campaign totals (atomic operation)
   */
  static async incrementTotals(
    campaignId: string,
    amount: number,
    incrementPledges: boolean = true,
    incrementDonors: boolean = false
  ): Promise<ICampaignTotals> {
    try {
      const update: any = {
        $inc: {
          totalAmount: amount,
        },
        $set: {
          lastUpdated: new Date(),
        },
      };

      if (incrementPledges) {
        update.$inc.totalPledges = 1;
      }

      if (incrementDonors) {
        update.$inc.totalDonors = 1;
      }

      const totals = await CampaignTotals.findOneAndUpdate(
        { campaignId },
        update,
        {
          upsert: true,
          new: true,
        }
      );

      logger.info('Incremented campaign totals', {
        campaignId,
        amount,
        incrementPledges,
        incrementDonors,
        newTotal: totals.totalAmount,
      });

      return totals;
    } catch (error) {
      logger.error('Error incrementing campaign totals', {
        campaignId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Decrement campaign totals (atomic operation)
   */
  static async decrementTotals(
    campaignId: string,
    amount: number,
    decrementPledges: boolean = true
  ): Promise<ICampaignTotals> {
    try {
      const update: any = {
        $inc: {
          totalAmount: -amount,
        },
        $set: {
          lastUpdated: new Date(),
        },
      };

      if (decrementPledges) {
        update.$inc.totalPledges = -1;
      }

      const totals = await CampaignTotals.findOneAndUpdate(
        { campaignId },
        update,
        {
          new: true,
        }
      );

      if (!totals) {
        logger.warn('Campaign totals not found for decrement', { campaignId });
        // Create with negative values if doesn't exist (shouldn't happen, but handle gracefully)
        return await CampaignTotals.create({
          campaignId,
          totalAmount: -amount,
          totalPledges: decrementPledges ? -1 : 0,
          totalDonors: 0,
          lastUpdated: new Date(),
        });
      }

      // Ensure values don't go negative
      if (totals.totalAmount < 0) {
        totals.totalAmount = 0;
      }
      if (totals.totalPledges < 0) {
        totals.totalPledges = 0;
      }
      if (totals.totalDonors < 0) {
        totals.totalDonors = 0;
      }
      await totals.save();

      logger.info('Decremented campaign totals', {
        campaignId,
        amount,
        decrementPledges,
        newTotal: totals.totalAmount,
      });

      return totals;
    } catch (error) {
      logger.error('Error decrementing campaign totals', {
        campaignId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List all campaign totals
   */
  static async listCampaignTotals(filters: {
    limit?: number;
    offset?: number;
    sortBy?: 'totalAmount' | 'totalPledges' | 'lastUpdated';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ totals: ICampaignTotals[]; total: number }> {
    try {
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      const sortBy = filters.sortBy || 'totalAmount';
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

      const sort: any = {};
      sort[sortBy] = sortOrder;

      const [totals, total] = await Promise.all([
        CampaignTotals.find({})
          .sort(sort)
          .limit(limit)
          .skip(offset)
          .exec(),
        CampaignTotals.countDocuments({}),
      ]);

      return { totals, total };
    } catch (error) {
      logger.error('Error listing campaign totals', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Reset campaign totals (for testing/admin use)
   */
  static async resetCampaignTotals(campaignId: string): Promise<ICampaignTotals> {
    try {
      const totals = await CampaignTotals.findOneAndUpdate(
        { campaignId },
        {
          $set: {
            totalAmount: 0,
            totalPledges: 0,
            totalDonors: 0,
            lastUpdated: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      logger.info('Reset campaign totals', { campaignId });

      return totals;
    } catch (error) {
      logger.error('Error resetting campaign totals', {
        campaignId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

