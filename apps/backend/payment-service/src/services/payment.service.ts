import mongoose from 'mongoose';
import { Payment, PaymentStatus, IPayment } from '../models/payment.model';
import { CreatePaymentInput, UpdatePaymentInput } from '../types/payment.types';
import { PaymentProviderFactory } from './payment-provider.service';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'payment-service',
  minLevel: 'info',
});

// ============================================================================
// PAYMENT SERVICE
// ============================================================================

export class PaymentService {
  /**
   * Create a new payment
   */
  static async createPayment(input: CreatePaymentInput): Promise<IPayment> {
    try {
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payment = await Payment.create({
        paymentId,
        donationId: input.donationId,
        amount: input.amount,
        provider: input.provider,
        status: PaymentStatus.PENDING,
        idempotencyKey: input.idempotencyKey,
        paymentMethodId: input.paymentMethodId,
        metadata: input.metadata,
        pendingAt: new Date(),
      });

      logger.info('Payment created', {
        paymentId: payment.paymentId,
        donationId: payment.donationId,
        amount: payment.amount,
      });

      return payment;
    } catch (error) {
      logger.error('Error creating payment', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Authorize a payment
   */
  static async authorizePayment(paymentId: string): Promise<IPayment> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findOne({ paymentId }).session(session);

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      // Check state transition
      if (!payment.canTransitionTo(PaymentStatus.AUTHORIZED)) {
        throw new Error(
          `Cannot transition from ${payment.status} to ${PaymentStatus.AUTHORIZED}`
        );
      }

      // Call payment provider
      const provider = PaymentProviderFactory.getProvider(payment.provider);
      const result = await provider.authorize({
        amount: payment.amount,
        paymentMethodId: payment.paymentMethodId,
        metadata: payment.metadata,
      });

      if (!result.success) {
        // Authorization failed
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = result.errorMessage || 'Authorization failed';
        payment.failedAt = new Date();
        await payment.save({ session });
        await session.commitTransaction();

        logger.warn('Payment authorization failed', {
          paymentId,
          reason: payment.failureReason,
        });

        return payment;
      }

      // Authorization successful
      payment.status = PaymentStatus.AUTHORIZED;
      payment.providerTransactionId = result.transactionId;
      payment.authorizedAt = new Date();
      payment.metadata = { ...payment.metadata, ...result.metadata };
      await payment.save({ session });

      await session.commitTransaction();

      logger.info('Payment authorized', {
        paymentId,
        transactionId: payment.providerTransactionId,
      });

      return payment;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error authorizing payment', {
        paymentId,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Capture an authorized payment
   */
  static async capturePayment(paymentId: string, amount?: number): Promise<IPayment> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findOne({ paymentId }).session(session);

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      // Check state transition
      if (!payment.canTransitionTo(PaymentStatus.CAPTURED)) {
        throw new Error(
          `Cannot transition from ${payment.status} to ${PaymentStatus.CAPTURED}`
        );
      }

      if (!payment.providerTransactionId) {
        throw new Error('No provider transaction ID found');
      }

      // Call payment provider
      const provider = PaymentProviderFactory.getProvider(payment.provider);
      const result = await provider.capture({
        transactionId: payment.providerTransactionId,
        amount,
      });

      if (!result.success) {
        // Capture failed
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = result.errorMessage || 'Capture failed';
        payment.failedAt = new Date();
        await payment.save({ session });
        await session.commitTransaction();

        logger.warn('Payment capture failed', {
          paymentId,
          reason: payment.failureReason,
        });

        return payment;
      }

      // Capture successful
      payment.status = PaymentStatus.CAPTURED;
      payment.capturedAt = new Date();
      payment.metadata = { ...payment.metadata, ...result.metadata };
      await payment.save({ session });

      await session.commitTransaction();

      logger.info('Payment captured', { paymentId });

      return payment;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error capturing payment', {
        paymentId,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Complete a captured payment
   */
  static async completePayment(paymentId: string): Promise<IPayment> {
    try {
      const payment = await Payment.findOne({ paymentId });

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      // Check state transition
      if (!payment.canTransitionTo(PaymentStatus.COMPLETED)) {
        throw new Error(
          `Cannot transition from ${payment.status} to ${PaymentStatus.COMPLETED}`
        );
      }

      payment.status = PaymentStatus.COMPLETED;
      payment.completedAt = new Date();
      await payment.save();

      logger.info('Payment completed', { paymentId });

      return payment;
    } catch (error) {
      logger.error('Error completing payment', {
        paymentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  static async refundPayment(
    paymentId: string,
    reason: string,
    amount?: number
  ): Promise<IPayment> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findOne({ paymentId }).session(session);

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      // Check state transition
      if (!payment.canTransitionTo(PaymentStatus.REFUNDED)) {
        throw new Error(
          `Cannot transition from ${payment.status} to ${PaymentStatus.REFUNDED}`
        );
      }

      if (!payment.providerTransactionId) {
        throw new Error('No provider transaction ID found');
      }

      // Call payment provider
      const provider = PaymentProviderFactory.getProvider(payment.provider);
      const result = await provider.refund({
        transactionId: payment.providerTransactionId,
        amount,
        reason,
      });

      if (!result.success) {
        throw new Error(result.errorMessage || 'Refund failed');
      }

      // Refund successful
      payment.status = PaymentStatus.REFUNDED;
      payment.refundReason = reason;
      payment.refundedAt = new Date();
      payment.metadata = { ...payment.metadata, ...result.metadata, refundId: result.refundId };
      await payment.save({ session });

      await session.commitTransaction();

      logger.info('Payment refunded', { paymentId, reason });

      return payment;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error refunding payment', {
        paymentId,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get payment by ID
   */
  static async getPayment(paymentId: string): Promise<IPayment | null> {
    try {
      return await Payment.findOne({ paymentId });
    } catch (error) {
      logger.error('Error getting payment', {
        paymentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get payment by donation ID
   */
  static async getPaymentByDonation(donationId: string): Promise<IPayment | null> {
    try {
      return await Payment.findOne({ donationId }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Error getting payment by donation', {
        donationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List payments with filters
   */
  static async listPayments(filters: {
    donationId?: string;
    provider?: string;
    status?: PaymentStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: IPayment[]; total: number }> {
    try {
      const query: any = {};

      if (filters.donationId) {
        query.donationId = filters.donationId;
      }

      if (filters.provider) {
        query.provider = filters.provider;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      const [payments, total] = await Promise.all([
        Payment.find(query).sort({ createdAt: -1 }).limit(limit).skip(offset).exec(),
        Payment.countDocuments(query),
      ]);

      return { payments, total };
    } catch (error) {
      logger.error('Error listing payments', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update payment
   */
  static async updatePayment(paymentId: string, updates: UpdatePaymentInput): Promise<IPayment> {
    try {
      const payment = await Payment.findOne({ paymentId });

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      // Check state transition if status is being updated
      if (updates.status && updates.status !== payment.status) {
        if (!payment.canTransitionTo(updates.status)) {
          throw new Error(
            `Cannot transition from ${payment.status} to ${updates.status}`
          );
        }
      }

      // Apply updates
      Object.assign(payment, updates);
      await payment.save();

      logger.info('Payment updated', { paymentId, updates });

      return payment;
    } catch (error) {
      logger.error('Error updating payment', {
        paymentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

