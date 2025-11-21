import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const PledgeStateEnum = z.enum(['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED']);

const PledgeSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  userId: z.string(),
  amount: z.number().positive(),
  state: PledgeStateEnum,
  paymentIntentId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreatePledgeSchema = z.object({
  campaignId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
});

const TransitionStateSchema = z.object({
  newState: PledgeStateEnum,
  reason: z.string().optional(),
});

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export const createPledgeRoute = createRoute({
  method: 'post',
  path: '/donations',
  tags: ['Donations'],
  summary: 'Create a new donation',
  description: 'Create a new donation for a campaign',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreatePledgeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Donation created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: PledgeSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

export const getPledgeRoute = createRoute({
  method: 'get',
  path: '/donations/{id}',
  tags: ['Donations'],
  summary: 'Get donation by ID',
  description: 'Retrieve a single donation by its ID',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Donation details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: PledgeSchema,
          }),
        },
      },
    },
    404: {
      description: 'Donation not found',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

export const transitionPledgeStateRoute = createRoute({
  method: 'post',
  path: '/donations/{id}/transition',
  tags: ['Donations'],
  summary: 'Transition donation state',
  description: 'Change the state of a donation (e.g., PENDING -> AUTHORIZED -> CAPTURED)',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: TransitionStateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'State transition successful',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid state transition',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

