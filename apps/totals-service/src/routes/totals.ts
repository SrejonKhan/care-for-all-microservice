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

// ============================================================================
// ROUTES
// ============================================================================

export const getCampaignTotalsRoute = createRoute({
  method: 'get',
  path: '/totals/campaigns/{campaignId}',
  tags: ['Totals'],
  summary: 'Get campaign totals',
  description: 'Retrieve aggregated totals for a campaign (materialized view)',
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
      description: 'Campaign not found',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

