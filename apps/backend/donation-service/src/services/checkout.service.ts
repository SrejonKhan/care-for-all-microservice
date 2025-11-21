import mongoose from 'mongoose';
import { DonationService } from './donation.service';
import { BankMockService } from './bank-mock.service';
import { EventService } from './event.service';
import { DonationStatus, IDonation } from '../models/donation.model';
import { CreateDonationInput } from '../types/donation.types';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

// ============================================================================
// CHECKOUT RESULT
// ============================================================================

export interface CheckoutResult {
  success: boolean;
  donation?: IDonation;
  error?: string;
  errorCode?: string;
}

// ============================================================================
// CHECKOUT SERVICE
// ============================================================================

export class CheckoutService {
  /**
   * Process donation checkout with bank balance verification
   */
  static async processDonation(input: CreateDonationInput): Promise<CheckoutResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info('Processing donation checkout', {
        campaignId: input.campaignId,
        amount: input.amount,
        isGuest: input.isGuest,
      });

      // Step 1: Create donation in PENDING state
      const donation = await DonationService.createDonation(input);

      logger.info('Donation created, checking bank balance', {
        donationId: donation.id,
        bankAccountId: input.bankAccountId,
      });

      // Step 2: Update to BALANCE_CHECK status
      await DonationService.updateDonation(donation.id, {
        status: DonationStatus.BALANCE_CHECK,
      });

      // Step 3: Check bank balance
      const bankAccountId = input.bankAccountId || 'bank_acc_guest';
      const balanceCheck = await BankMockService.checkBalance(
        bankAccountId,
        input.amount
      );

      if (!balanceCheck.success || !balanceCheck.hasSufficientBalance) {
        logger.warn('Insufficient balance for donation', {
          donationId: donation.id,
          bankAccountId,
          currentBalance: balanceCheck.currentBalance,
          requestedAmount: input.amount,
        });

        // Step 4a: Mark as FAILED due to insufficient balance
        await DonationService.updateDonation(donation.id, {
          status: DonationStatus.FAILED,
          failureReason: balanceCheck.error || 'Insufficient balance',
          failedAt: new Date(),
        });

        // Publish failed event to Outbox
        await EventService.publishDonationFailed(
          {
            donationId: donation.id,
            campaignId: donation.campaignId,
            amount: donation.amount,
            reason: balanceCheck.error || 'Insufficient balance',
            timestamp: new Date().toISOString(),
          },
          session
        );

        await session.commitTransaction();

        return {
          success: false,
          error: balanceCheck.error || 'Insufficient balance',
          errorCode: 'INSUFFICIENT_BALANCE',
        };
      }

      // Step 4b: Deduct from bank account
      const deducted = await BankMockService.deductBalance(bankAccountId, input.amount);

      if (!deducted) {
        logger.error('Failed to deduct bank balance', {
          donationId: donation.id,
          bankAccountId,
        });

        await DonationService.updateDonation(donation.id, {
          status: DonationStatus.FAILED,
          failureReason: 'Failed to process payment',
          failedAt: new Date(),
        });

        await EventService.publishDonationFailed(
          {
            donationId: donation.id,
            campaignId: donation.campaignId,
            amount: donation.amount,
            reason: 'Failed to process payment',
            timestamp: new Date().toISOString(),
          },
          session
        );

        await session.commitTransaction();

        return {
          success: false,
          error: 'Failed to process payment',
          errorCode: 'PAYMENT_PROCESSING_FAILED',
        };
      }

      // Step 5: Update to AUTHORIZED
      await DonationService.updateDonation(donation.id, {
        status: DonationStatus.AUTHORIZED,
        authorizedAt: new Date(),
      });

      logger.info('Donation authorized', { donationId: donation.id });

      // Step 6: Immediately capture (simplified flow)
      await DonationService.updateDonation(donation.id, {
        status: DonationStatus.CAPTURED,
        capturedAt: new Date(),
      });

      logger.info('Donation captured', { donationId: donation.id });

      // Step 7: Mark as COMPLETED
      const completedDonation = await DonationService.updateDonation(donation.id, {
        status: DonationStatus.COMPLETED,
        completedAt: new Date(),
      });

      if (!completedDonation) {
        throw new Error('Failed to mark donation as completed');
      }

      logger.info('Donation completed', { donationId: donation.id });

      // Step 8: Publish donation.created event to Outbox
      await EventService.publishDonationCreated(
        {
          donationId: completedDonation.id,
          campaignId: completedDonation.campaignId,
          amount: completedDonation.amount,
          donorId: completedDonation.donorId,
          donorName: completedDonation.donorName,
          isAnonymous: completedDonation.isAnonymous,
          isGuest: completedDonation.isGuest,
          timestamp: new Date().toISOString(),
        },
        session
      );

      // Step 9: Publish donation.completed event to Outbox
      await EventService.publishDonationCompleted(
        {
          donationId: completedDonation.id,
          campaignId: completedDonation.campaignId,
          amount: completedDonation.amount,
          donorId: completedDonation.donorId,
          timestamp: new Date().toISOString(),
        },
        session
      );

      // Commit transaction
      await session.commitTransaction();

      logger.info('Donation checkout completed successfully', {
        donationId: completedDonation.id,
        campaignId: completedDonation.campaignId,
        amount: completedDonation.amount,
      });

      return {
        success: true,
        donation: completedDonation,
      };
    } catch (error) {
      logger.error('Error processing donation checkout', {
        input,
        error: (error as Error).message,
      });

      await session.abortTransaction();

      return {
        success: false,
        error: 'Internal server error during checkout',
        errorCode: 'CHECKOUT_ERROR',
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Refund a donation
   */
  static async refundDonation(
    donationId: string,
    reason: string
  ): Promise<CheckoutResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info('Processing donation refund', { donationId, reason });

      // Get donation
      const donation = await DonationService.getDonationById(donationId);

      if (!donation) {
        return {
          success: false,
          error: 'Donation not found',
          errorCode: 'NOT_FOUND',
        };
      }

      if (donation.status !== DonationStatus.COMPLETED) {
        return {
          success: false,
          error: 'Only completed donations can be refunded',
          errorCode: 'INVALID_STATUS',
        };
      }

      // Refund to bank account
      const bankAccountId = donation.bankAccountId || 'bank_acc_guest';
      const refunded = await BankMockService.refundBalance(bankAccountId, donation.amount);

      if (!refunded) {
        return {
          success: false,
          error: 'Failed to refund to bank account',
          errorCode: 'REFUND_FAILED',
        };
      }

      // Update donation status
      const refundedDonation = await DonationService.updateDonation(donationId, {
        status: DonationStatus.REFUNDED,
        refundReason: reason,
        refundedAt: new Date(),
      });

      if (!refundedDonation) {
        throw new Error('Failed to update donation status');
      }

      // Publish refund event to Outbox
      await EventService.publishDonationRefunded(
        {
          donationId: refundedDonation.id,
          campaignId: refundedDonation.campaignId,
          amount: refundedDonation.amount,
          reason,
          timestamp: new Date().toISOString(),
        },
        session
      );

      await session.commitTransaction();

      logger.info('Donation refunded successfully', {
        donationId: refundedDonation.id,
        amount: refundedDonation.amount,
      });

      return {
        success: true,
        donation: refundedDonation,
      };
    } catch (error) {
      logger.error('Error processing donation refund', {
        donationId,
        reason,
        error: (error as Error).message,
      });

      await session.abortTransaction();

      return {
        success: false,
        error: 'Internal server error during refund',
        errorCode: 'REFUND_ERROR',
      };
    } finally {
      session.endSession();
    }
  }
}

