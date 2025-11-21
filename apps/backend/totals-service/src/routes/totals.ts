import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const CampaignTotalsSchema = z.object({
  campaignId: z.string(),
  totalAmount: z.number().nonnegative(),
  totalPledges: z.number().nonnegative().int(),
  totalDonors: z.number().nonnegative().int(),
  lastUpdated: z.string(),
});

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: CampaignTotalsSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
});

const ListTotalsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z.enum(['totalAmount', 'totalPledges', 'lastUpdated']).optional().default('totalAmount'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const ListTotalsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totals: z.array(CampaignTotalsSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
});

// ============================================================================
// ROUTES
// ============================================================================

export const getCampaignTotalsRoute = createRoute({
  method: 'get',
  path: '/api/totals/campaigns/{campaignId}',
  tags: ['Totals'],
  summary: 'Get campaign totals',
  description: 'Retrieve aggregated totals for a campaign (materialized view - fast read)',
  request: {
    params: z.object({
      campaignId: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Campaign totals',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    404: {
      description: 'Campaign totals not found',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

export const listCampaignTotalsRoute = createRoute({
  method: 'get',
  path: '/api/totals/campaigns',
  tags: ['Totals'],
  summary: 'List all campaign totals',
  description: 'List all campaign totals with pagination and sorting',
  request: {
    query: ListTotalsQuerySchema,
  },
  responses: {
    200: {
      description: 'Campaign totals list',
      content: {
        'application/json': {
          schema: ListTotalsResponseSchema,
        },
      },
    },
  },
});

