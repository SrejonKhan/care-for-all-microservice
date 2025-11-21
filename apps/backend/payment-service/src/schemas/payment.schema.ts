import { z } from 'zod';
import { PaymentProvider, PaymentStatus } from '../models';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const AuthorizePaymentSchema = z.object({
  donationId: z.string().min(1, 'Donation ID is required'),
  amount: z.number().positive('Amount must be positive'),
  provider: z.nativeEnum(PaymentProvider),
  paymentMethodId: z.string().optional(),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  metadata: z.record(z.any()).optional(),
});

export const CapturePaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
});

export const RefundPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  reason: z.string().min(1, 'Refund reason is required'),
});

export const ListPaymentsQuerySchema = z.object({
  donationId: z.string().optional(),
  provider: z.nativeEnum(PaymentProvider).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PaymentResponseSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  donationId: z.string(),
  amount: z.number(),
  provider: z.nativeEnum(PaymentProvider),
  status: z.nativeEnum(PaymentStatus),
  providerTransactionId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  authorizedAt: z.string().optional(),
  capturedAt: z.string().optional(),
  completedAt: z.string().optional(),
  failedAt: z.string().optional(),
  refundedAt: z.string().optional(),
  failureReason: z.string().optional(),
  refundReason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ListPaymentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    payments: z.array(PaymentResponseSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
});

export const PaymentActionResponseSchema = z.object({
  success: z.boolean(),
  data: PaymentResponseSchema,
});

// ============================================================================
// ERROR SCHEMAS
// ============================================================================

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

// ============================================================================
// TYPES
// ============================================================================

export type AuthorizePaymentInput = z.infer<typeof AuthorizePaymentSchema>;
export type CapturePaymentInput = z.infer<typeof CapturePaymentSchema>;
export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof ListPaymentsQuerySchema>;
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

