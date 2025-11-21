import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const CampaignStatusEnum = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
]);

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const CreateCampaignRequestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  goalAmount: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  category: z.string().max(100).optional(),
  imageUrl: z.union([z.string().url().max(500), z.literal('')]).optional(),
});

export const UpdateCampaignRequestSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  goalAmount: z.number().positive().optional(),
  status: CampaignStatusEnum.optional(),
  endDate: z.string().datetime().optional(),
  category: z.string().max(100).optional(),
  imageUrl: z.union([z.string().url().max(500), z.literal('')]).optional(),
});

export const ListCampaignsQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  pageSize: z.string().default('10').transform(Number),
  status: CampaignStatusEnum.optional(),
  ownerId: z.string().optional(),
  category: z.string().optional(),
});

export const CampaignIdParamSchema = z.object({
  id: z.string(),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const CampaignSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  goalAmount: z.number(),
  currentAmount: z.number(),
  status: CampaignStatusEnum,
  ownerId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaginatedCampaignsSchema = z.object({
  items: z.array(CampaignSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
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

export const CampaignResponseSchema = z.object({
  success: z.boolean(),
  data: CampaignSchema,
});

export const PaginatedCampaignsResponseSchema = z.object({
  success: z.boolean(),
  data: PaginatedCampaignsSchema,
});

