import { Donation, DonationStatus, IDonation } from '../models/donation.model';
import {
  CreateDonationInput,
  UpdateDonationInput,
  DonationFilter,
  DonationListOptions,
} from '../types/donation.types';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

// ============================================================================
// DONATION SERVICE
// ============================================================================

export class DonationService {
  /**
   * Create a new donation
   */
  static async createDonation(input: CreateDonationInput): Promise<IDonation> {
    try {
      logger.info('Creating donation', { input });

      const donation = await Donation.create({
        campaignId: input.campaignId,
        amount: input.amount,
        donorId: input.donorId,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        isAnonymous: input.isAnonymous || false,
        isGuest: input.isGuest || false,
        bankAccountId: input.bankAccountId,
        status: DonationStatus.PENDING,
      });

      logger.info('Donation created successfully', {
        donationId: donation.id,
        campaignId: donation.campaignId,
        amount: donation.amount,
      });

      return donation;
    } catch (error) {
      logger.error('Error creating donation', {
        input,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get donation by ID
   */
  static async getDonationById(donationId: string): Promise<IDonation | null> {
    try {
      logger.info('Getting donation by ID', { donationId });

      const donation = await Donation.findById(donationId);

      if (!donation) {
        logger.warn('Donation not found', { donationId });
        return null;
      }

      return donation;
    } catch (error) {
      logger.error('Error getting donation', {
        donationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update donation
   */
  static async updateDonation(
    donationId: string,
    input: UpdateDonationInput
  ): Promise<IDonation | null> {
    try {
      logger.info('Updating donation', { donationId, input });

      const donation = await Donation.findById(donationId);

      if (!donation) {
        logger.warn('Donation not found for update', { donationId });
        return null;
      }

      // Update fields
      if (input.status !== undefined) {
        // Validate state transition
        if (!donation.canTransitionTo(input.status)) {
          throw new Error(
            `Invalid state transition from ${donation.status} to ${input.status}`
          );
        }
        donation.status = input.status;
      }

      if (input.failureReason !== undefined) {
        donation.failureReason = input.failureReason;
      }

      if (input.refundReason !== undefined) {
        donation.refundReason = input.refundReason;
      }

      if (input.authorizedAt !== undefined) {
        donation.authorizedAt = input.authorizedAt;
      }

      if (input.capturedAt !== undefined) {
        donation.capturedAt = input.capturedAt;
      }

      if (input.completedAt !== undefined) {
        donation.completedAt = input.completedAt;
      }

      if (input.failedAt !== undefined) {
        donation.failedAt = input.failedAt;
      }

      if (input.refundedAt !== undefined) {
        donation.refundedAt = input.refundedAt;
      }

      await donation.save();

      logger.info('Donation updated successfully', {
        donationId: donation.id,
        status: donation.status,
      });

      return donation;
    } catch (error) {
      logger.error('Error updating donation', {
        donationId,
        input,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List donations with filters and pagination
   */
  static async listDonations(
    filter: DonationFilter = {},
    options: DonationListOptions = {}
  ): Promise<{ donations: IDonation[]; total: number; page: number; limit: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

      logger.info('Listing donations', { filter, options });

      // Build query
      const query: any = {};

      if (filter.campaignId) {
        query.campaignId = filter.campaignId;
      }

      if (filter.donorId) {
        query.donorId = filter.donorId;
      }

      if (filter.status) {
        query.status = filter.status;
      }

      if (filter.isGuest !== undefined) {
        query.isGuest = filter.isGuest;
      }

      if (filter.startDate || filter.endDate) {
        query.createdAt = {};
        if (filter.startDate) {
          query.createdAt.$gte = filter.startDate;
        }
        if (filter.endDate) {
          query.createdAt.$lte = filter.endDate;
        }
      }

      // Execute query
      const [donations, total] = await Promise.all([
        Donation.find(query)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .exec(),
        Donation.countDocuments(query),
      ]);

      logger.info('Donations listed successfully', {
        total,
        page,
        limit,
        returned: donations.length,
      });

      return {
        donations,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error listing donations', {
        filter,
        options,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get donations by campaign
   */
  static async getDonationsByCampaign(campaignId: string): Promise<IDonation[]> {
    try {
      logger.info('Getting donations by campaign', { campaignId });

      const donations = await Donation.find({ campaignId })
        .sort({ createdAt: -1 })
        .exec();

      logger.info('Donations retrieved', {
        campaignId,
        count: donations.length,
      });

      return donations;
    } catch (error) {
      logger.error('Error getting donations by campaign', {
        campaignId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get donations by donor
   */
  static async getDonationsByDonor(donorId: string): Promise<IDonation[]> {
    try {
      logger.info('Getting donations by donor', { donorId });

      const donations = await Donation.find({ donorId })
        .sort({ createdAt: -1 })
        .exec();

      logger.info('Donations retrieved', {
        donorId,
        count: donations.length,
      });

      return donations;
    } catch (error) {
      logger.error('Error getting donations by donor', {
        donorId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get donation statistics for a campaign
   */
  static async getCampaignStats(campaignId: string): Promise<{
    totalAmount: number;
    donationCount: number;
    averageDonation: number;
  }> {
    try {
      logger.info('Getting campaign donation stats', { campaignId });

      const stats = await Donation.aggregate([
        {
          $match: {
            campaignId,
            status: { $in: [DonationStatus.COMPLETED, DonationStatus.CAPTURED] },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            donationCount: { $sum: 1 },
            averageDonation: { $avg: '$amount' },
          },
        },
      ]);

      const result = stats[0] || {
        totalAmount: 0,
        donationCount: 0,
        averageDonation: 0,
      };

      logger.info('Campaign stats retrieved', { campaignId, result });

      return result;
    } catch (error) {
      logger.error('Error getting campaign stats', {
        campaignId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

