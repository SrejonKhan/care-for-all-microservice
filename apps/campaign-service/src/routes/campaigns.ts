import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const CampaignStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']);

const CampaignSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  goalAmount: z.number().positive(),
  currentAmount: z.number().nonnegative(),
  status: CampaignStatusEnum,
  ownerId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreateCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  goalAmount: z.number().positive(),
  startDate: z.string(),
  endDate: z.string(),
});

const UpdateCampaignSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  goalAmount: z.number().positive().optional(),
  status: CampaignStatusEnum.optional(),
  endDate: z.string().optional(),
});

const ListQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  pageSize: z.string().default('10').transform(Number),
  status: CampaignStatusEnum.optional(),
  ownerId: z.string().optional(),
});

const PaginatedResponseSchema = z.object({
  items: z.array(CampaignSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
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

export const listCampaignsRoute = createRoute({
  method: 'get',
  path: '/campaigns',
  tags: ['Campaigns'],
  summary: 'List campaigns',
  description: 'Retrieve a paginated list of campaigns',
  request: {
    query: ListQuerySchema,
  },
  responses: {
    200: {
      description: 'List of campaigns',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: PaginatedResponseSchema,
          }),
        },
      },
    },
  },
});

export const getCampaignRoute = createRoute({
  method: 'get',
  path: '/campaigns/{id}',
  tags: ['Campaigns'],
  summary: 'Get campaign by ID',
  description: 'Retrieve a single campaign by its ID',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Campaign details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: CampaignSchema,
          }),
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

export const createCampaignRoute = createRoute({
  method: 'post',
  path: '/campaigns',
  tags: ['Campaigns'],
  summary: 'Create a new campaign',
  description: 'Create a new campaign with the provided details',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCampaignSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Campaign created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: CampaignSchema,
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

export const updateCampaignRoute = createRoute({
  method: 'patch',
  path: '/campaigns/{id}',
  tags: ['Campaigns'],
  summary: 'Update a campaign',
  description: 'Update campaign details',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateCampaignSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Campaign updated successfully',
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

