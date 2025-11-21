import { Campaign, ICampaign, CampaignStatus } from '../models/campaign.model';
import {
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignFilters,
  PaginationOptions,
  PaginatedResult,
  CampaignError,
} from '../types/campaign.types';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: 'info',
});

// ============================================================================
// CAMPAIGN SERVICE
// ============================================================================

export class CampaignService {
  /**
   * Create a new campaign
   */
  static async createCampaign(
    input: CreateCampaignInput,
    ownerId: string
  ): Promise<ICampaign> {
    try {
      // Validate date range
      if (new Date(input.endDate) <= new Date(input.startDate)) {
        throw new CampaignError(
          'End date must be after start date',
          'INVALID_DATE_RANGE',
          400
        );
      }

      // Create campaign
      const campaign = new Campaign({
        ...input,
        ownerId,
        currentAmount: 0,
        status: CampaignStatus.DRAFT,
      });

      await campaign.save();

      logger.info('Campaign created', {
        campaignId: campaign._id.toString(),
        ownerId,
        title: campaign.title,
      });

      return campaign;
    } catch (error) {
      if (error instanceof CampaignError) {
        throw error;
      }
      logger.error('Error creating campaign', error);
      throw new CampaignError(
        'Failed to create campaign',
        'CREATE_FAILED',
        500
      );
    }
  }

  /**
   * Get campaign by ID
   */
  static async getCampaignById(campaignId: string): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new CampaignError(
          'Campaign not found',
          'CAMPAIGN_NOT_FOUND',
          404
        );
      }

      return campaign;
    } catch (error) {
      if (error instanceof CampaignError) {
        throw error;
      }
      logger.error('Error getting campaign', error);
      throw new CampaignError(
        'Failed to get campaign',
        'GET_FAILED',
        500
      );
    }
  }

  /**
   * List campaigns with filters and pagination
   */
  static async listCampaigns(
    filters: CampaignFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<ICampaign>> {
    try {
      const { page, pageSize } = pagination;
      const skip = (page - 1) * pageSize;

      // Build query
      const query: any = {};
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.ownerId) {
        query.ownerId = filters.ownerId;
      }
      if (filters.category) {
        query.category = filters.category;
      }

      // Execute query
      const [items, total] = await Promise.all([
        Campaign.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .exec(),
        Campaign.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      logger.debug('Campaigns listed', {
        total,
        page,
        pageSize,
        filters,
      });

      return {
        items,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      logger.error('Error listing campaigns', error);
      throw new CampaignError(
        'Failed to list campaigns',
        'LIST_FAILED',
        500
      );
    }
  }

  /**
   * Update campaign
   */
  static async updateCampaign(
    campaignId: string,
    updates: UpdateCampaignInput
  ): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new CampaignError(
          'Campaign not found',
          'CAMPAIGN_NOT_FOUND',
          404
        );
      }

      // Validate date range if endDate is being updated
      if (updates.endDate) {
        const endDate = new Date(updates.endDate);
        const startDate = campaign.startDate;
        if (endDate <= startDate) {
          throw new CampaignError(
            'End date must be after start date',
            'INVALID_DATE_RANGE',
            400
          );
        }
      }

      // Apply updates
      Object.assign(campaign, updates);
      await campaign.save();

      logger.info('Campaign updated', {
        campaignId: campaign._id.toString(),
        updates: Object.keys(updates),
      });

      return campaign;
    } catch (error) {
      if (error instanceof CampaignError) {
        throw error;
      }
      logger.error('Error updating campaign', error);
      throw new CampaignError(
        'Failed to update campaign',
        'UPDATE_FAILED',
        500
      );
    }
  }

  /**
   * Delete campaign (soft delete by setting status to CANCELLED)
   */
  static async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new CampaignError(
          'Campaign not found',
          'CAMPAIGN_NOT_FOUND',
          404
        );
      }

      campaign.status = CampaignStatus.CANCELLED;
      await campaign.save();

      logger.info('Campaign deleted (cancelled)', {
        campaignId: campaign._id.toString(),
      });
    } catch (error) {
      if (error instanceof CampaignError) {
        throw error;
      }
      logger.error('Error deleting campaign', error);
      throw new CampaignError(
        'Failed to delete campaign',
        'DELETE_FAILED',
        500
      );
    }
  }

  /**
   * Update campaign status
   */
  static async updateCampaignStatus(
    campaignId: string,
    newStatus: CampaignStatus
  ): Promise<{ campaign: ICampaign; oldStatus: CampaignStatus }> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new CampaignError(
          'Campaign not found',
          'CAMPAIGN_NOT_FOUND',
          404
        );
      }

      const oldStatus = campaign.status;
      campaign.status = newStatus;
      await campaign.save();

      logger.info('Campaign status updated', {
        campaignId: campaign._id.toString(),
        oldStatus,
        newStatus,
      });

      return { campaign, oldStatus };
    } catch (error) {
      if (error instanceof CampaignError) {
        throw error;
      }
      logger.error('Error updating campaign status', error);
      throw new CampaignError(
        'Failed to update campaign status',
        'STATUS_UPDATE_FAILED',
        500
      );
    }
  }

  /**
   * Update campaign current amount (called by donation event handler)
   */
  static async updateCurrentAmount(
    campaignId: string,
    amountDelta: number
  ): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new CampaignError(
          'Campaign not found',
          'CAMPAIGN_NOT_FOUND',
          404
        );
      }

      campaign.currentAmount += amountDelta;

      // Ensure currentAmount doesn't go negative
      if (campaign.currentAmount < 0) {
        campaign.currentAmount = 0;
      }

      await campaign.save();

      logger.info('Campaign amount updated', {
        campaignId: campaign._id.toString(),
        amountDelta,
        newAmount: campaign.currentAmount,
      });

      return campaign;
    } catch (error) {
      if (error instanceof CampaignError) {
        throw error;
      }
      logger.error('Error updating campaign amount', error);
      throw new CampaignError(
        'Failed to update campaign amount',
        'AMOUNT_UPDATE_FAILED',
        500
      );
    }
  }

  /**
   * Check if user owns campaign
   */
  static async isOwner(campaignId: string, userId: string): Promise<boolean> {
    try {
      const campaign = await Campaign.findById(campaignId);
      return campaign ? campaign.ownerId === userId : false;
    } catch (error) {
      logger.error('Error checking campaign ownership', error);
      return false;
    }
  }
}

