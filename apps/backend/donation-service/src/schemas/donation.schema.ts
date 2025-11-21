import { z } from 'zod';

// ============================================================================
// DONATION SCHEMAS
// ============================================================================

export const DonationStatusEnum = z.enum([
  'PENDING',
  'BALANCE_CHECK',
  'AUTHORIZED',
  'CAPTURED',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
]);

export const CreateDonationSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  amount: z.number().positive('Amount must be positive'),
  donorName: z.string().min(1).max(200).optional(),
  donorEmail: z.string().email().optional(),
  isAnonymous: z.boolean().optional().default(false),
  bankAccountId: z.string().optional(),
});

export const RefundDonationSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const GetDonationsQuerySchema = z.object({
  campaignId: z.string().optional(),
  status: DonationStatusEnum.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const DonationResponseSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  donorId: z.string().optional(),
  donorName: z.string().optional(),
  donorEmail: z.string().optional(),
  amount: z.number(),
  status: DonationStatusEnum,
  isAnonymous: z.boolean(),
  isGuest: z.boolean(),
  bankAccountId: z.string().optional(),
  failureReason: z.string().optional(),
  refundReason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  authorizedAt: z.string().optional(),
  capturedAt: z.string().optional(),
  completedAt: z.string().optional(),
  failedAt: z.string().optional(),
  refundedAt: z.string().optional(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export const DonationListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    donations: z.array(DonationResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export const CheckoutResponseSchema = z.object({
  success: z.boolean(),
  data: DonationResponseSchema.optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

