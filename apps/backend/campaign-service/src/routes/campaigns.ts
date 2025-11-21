// @ts-nocheck - Complex type inference with Hono OpenAPI causes false positives
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { CampaignService } from '../services/campaign.service';
import { EventService } from '../services/event.service';
import { AuthClientService } from '../services/auth-client.service';
import { authMiddleware, getUser } from '../middleware/auth';
import { verifyCampaignOwnership } from '../middleware/ownership';
import { ROUTING_KEYS } from '../config/rabbitmq';
import {
  CreateCampaignRequestSchema,
  UpdateCampaignRequestSchema,
  ListCampaignsQuerySchema,
  CampaignIdParamSchema,
  CampaignResponseSchema,
  PaginatedCampaignsResponseSchema,
  ApiResponseSchema,
} from '../schemas/campaign.schema';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: 'info',
});

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

const listCampaignsRoute = createRoute({
  method: 'get',
  path: '/campaigns',
  tags: ['Campaigns'],
  summary: 'List campaigns',
  description: 'Retrieve a paginated list of campaigns with optional filters',
  request: {
    query: ListCampaignsQuerySchema,
  },
  responses: {
    200: {
      description: 'List of campaigns',
      content: {
        'application/json': {
          schema: PaginatedCampaignsResponseSchema,
        },
      },
    },
  },
});

const getCampaignRoute = createRoute({
  method: 'get',
  path: '/campaigns/{id}',
  tags: ['Campaigns'],
  summary: 'Get campaign by ID',
  description: 'Retrieve a single campaign by its ID',
  request: {
    params: CampaignIdParamSchema,
  },
  responses: {
    200: {
      description: 'Campaign details',
      content: {
        'application/json': {
          schema: CampaignResponseSchema,
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

const createCampaignRoute = createRoute({
  method: 'post',
  path: '/campaigns',
  tags: ['Campaigns'],
  summary: 'Create a new campaign',
  description: 'Create a new campaign. User will be elevated to CAMPAIGN_OWNER role.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCampaignRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Campaign created successfully',
      content: {
        'application/json': {
          schema: CampaignResponseSchema,
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
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

const updateCampaignRoute = createRoute({
  method: 'patch',
  path: '/campaigns/{id}',
  tags: ['Campaigns'],
  summary: 'Update a campaign',
  description: 'Update campaign details. Only owner or admin can update.',
  security: [{ bearerAuth: [] }],
  request: {
    params: CampaignIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateCampaignRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Campaign updated successfully',
      content: {
        'application/json': {
          schema: CampaignResponseSchema,
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
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
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

const deleteCampaignRoute = createRoute({
  method: 'delete',
  path: '/campaigns/{id}',
  tags: ['Campaigns'],
  summary: 'Delete a campaign',
  description: 'Delete (cancel) a campaign. Only owner or admin can delete.',
  security: [{ bearerAuth: [] }],
  request: {
    params: CampaignIdParamSchema,
  },
  responses: {
    200: {
      description: 'Campaign deleted successfully',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
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

// ============================================================================
// ROUTER
// ============================================================================

export const campaignRoutes = new OpenAPIHono();

// Simple test endpoint for debugging
campaignRoutes.post('/test', authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    return c.json({
      success: true,
      message: 'Auth middleware works',
      user: user ? {
        userId: user.userId,
        email: user.email,
        role: user.role
      } : null
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500);
  }
});

// List campaigns (public)
campaignRoutes.openapi(listCampaignsRoute, async (c) => {
  try {
    const query = c.req.valid('query');

    const result = await CampaignService.listCampaigns(
      {
        status: query.status,
        ownerId: query.ownerId,
        category: query.category,
      },
      {
        page: query.page,
        pageSize: query.pageSize,
      }
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      200
    );
  } catch (error) {
    logger.error('Error listing campaigns', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: 'Failed to list campaigns',
        },
      },
      500
    );
  }
});

// Get campaign by ID (public)
campaignRoutes.openapi(getCampaignRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');

    const campaign = await CampaignService.getCampaignById(id);

    return c.json(
      {
        success: true,
        data: campaign.toJSON(),
      },
      200
    );
  } catch (error: any) {
    if (error.code === 'CAMPAIGN_NOT_FOUND') {
      return c.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        404
      );
    }

    logger.error('Error getting campaign', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: 'Failed to get campaign',
        },
      },
      500
    );
  }
});

// Create campaign (authenticated) - with detailed error logging
campaignRoutes.openapi(createCampaignRoute, authMiddleware, async (c) => {
  try {
    logger.info('Campaign creation endpoint hit');
    
    const body = c.req.valid('json');
    logger.info('Request body parsed', { body });
    
    const user = getUser(c);
    logger.info('User extracted from context', { user });

    if (!user) {
      logger.warn('No user in context');
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    logger.info('About to create campaign', {
      userId: user.userId,
      title: body.title,
      goalAmount: body.goalAmount,
    });

    // Create campaign with detailed logging
    try {
      const campaignData = {
        title: body.title,
        description: body.description,
        goalAmount: body.goalAmount,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        category: body.category || undefined,
        imageUrl: body.imageUrl || undefined,
      };
      
      logger.info('Campaign data prepared', { campaignData });
      
      const campaign = await CampaignService.createCampaign(campaignData, user.userId);
      
      logger.info('Campaign created successfully', {
        campaignId: campaign._id.toString(),
        ownerId: user.userId,
      });

      return c.json(
        {
          success: true,
          data: {
            id: campaign._id.toString(),
            title: campaign.title,
            description: campaign.description,
            goalAmount: campaign.goalAmount,
            currentAmount: campaign.currentAmount,
            status: campaign.status,
            ownerId: campaign.ownerId,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            category: campaign.category,
            imageUrl: campaign.imageUrl,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt,
          },
        },
        201
      );
    } catch (serviceError) {
      logger.error('CampaignService.createCampaign failed', {
        error: serviceError,
        message: serviceError instanceof Error ? serviceError.message : 'Unknown service error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined,
      });
      throw serviceError;
    }
  } catch (error: any) {
    if (error.code === 'INVALID_DATE_RANGE') {
      return c.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        400
      );
    }

    logger.error('Error creating campaign', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create campaign',
        },
      },
      500
    );
  }
});

// Update campaign (authenticated, owner or admin)
campaignRoutes.openapi(
  updateCampaignRoute,
  authMiddleware,
  verifyCampaignOwnership,
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const user = getUser(c);

      // Track old status for event
      const oldCampaign = await CampaignService.getCampaignById(id);
      const oldStatus = oldCampaign.status;

      // Update campaign
      const updates: any = { ...body };
      if (body.endDate) {
        updates.endDate = new Date(body.endDate);
      }

      const campaign = await CampaignService.updateCampaign(id, updates);

      // Publish events
      if (body.status && body.status !== oldStatus) {
        await EventService.publishEvent(ROUTING_KEYS.CAMPAIGN_STATUS_CHANGED, {
          campaignId: id,
          oldStatus,
          newStatus: body.status,
          changedBy: user?.userId,
        });
      }

      await EventService.publishEvent(ROUTING_KEYS.CAMPAIGN_UPDATED, {
        campaignId: id,
        updates: body,
      });

      logger.info('Campaign updated', {
        campaignId: id,
        userId: user?.userId,
      });

      return c.json(
        {
          success: true,
          data: campaign.toJSON(),
        },
        200
      );
    } catch (error: any) {
      if (error.code === 'CAMPAIGN_NOT_FOUND') {
        return c.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          },
          404
        );
      }

      if (error.code === 'INVALID_DATE_RANGE') {
        return c.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          },
          400
        );
      }

      logger.error('Error updating campaign', error);
      return c.json(
        {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update campaign',
          },
        },
        500
      );
    }
  }
);

// Delete campaign (authenticated, owner or admin)
campaignRoutes.openapi(
  deleteCampaignRoute,
  authMiddleware,
  verifyCampaignOwnership,
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const user = getUser(c);

      await CampaignService.deleteCampaign(id);

      logger.info('Campaign deleted', {
        campaignId: id,
        userId: user?.userId,
      });

      return c.json(
        {
          success: true,
          data: {
            message: 'Campaign deleted successfully',
          },
        },
        200
      );
    } catch (error: any) {
      if (error.code === 'CAMPAIGN_NOT_FOUND') {
        return c.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          },
          404
        );
      }

      logger.error('Error deleting campaign', error);
      return c.json(
        {
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete campaign',
          },
        },
        500
      );
    }
  }
);
