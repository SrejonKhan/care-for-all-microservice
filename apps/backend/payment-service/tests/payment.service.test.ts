import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { PaymentService } from '../src/services/payment.service';
import { PaymentStatus, PaymentProvider } from '../src/models';

// Test database connection
const TEST_DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/payment-service-test';

describe('PaymentService', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URL);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('should create a payment', async () => {
    const input = {
      donationId: 'don_123',
      amount: 100,
      provider: PaymentProvider.MOCK,
      idempotencyKey: 'idem_test_123',
      paymentMethodId: 'pm_test',
      metadata: { test: true },
    };

    const payment = await PaymentService.createPayment(input);

    expect(payment).toBeDefined();
    expect(payment.donationId).toBe(input.donationId);
    expect(payment.amount).toBe(input.amount);
    expect(payment.status).toBe(PaymentStatus.PENDING);
  });

  test('should validate state transitions', async () => {
    const input = {
      donationId: 'don_456',
      amount: 200,
      provider: PaymentProvider.MOCK,
      idempotencyKey: 'idem_test_456',
    };

    const payment = await PaymentService.createPayment(input);

    // Valid transition: PENDING -> AUTHORIZED
    expect(payment.canTransitionTo(PaymentStatus.AUTHORIZED)).toBe(true);

    // Invalid transition: PENDING -> COMPLETED
    expect(payment.canTransitionTo(PaymentStatus.COMPLETED)).toBe(false);
  });
});

