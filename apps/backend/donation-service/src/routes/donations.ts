// @ts-nocheck
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { CheckoutService } from '../services/checkout.service';
import { DonationService } from '../services/donation.service';
import { CampaignClientService } from '../services/campaign-client.service';
import { BankMockService } from '../services/bank-mock.service';
import { optionalAuth, requireAuth } from '../middleware/auth';
import {
  CreateDonationSchema,
  RefundDonationSchema,
  GetDonationsQuerySchema,
  DonationResponseSchema,
  ApiResponseSchema,
  DonationListResponseSchema,
  CheckoutResponseSchema,
} from '../schemas/donation.schema';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

const createDonationRoute = createRoute({
  method: 'post',
  path: '/donations',
  tags: ['Donations'],
  summary: 'Create a new donation (checkout)',
  description:
    'Create a donation and process checkout with bank balance verification. Supports both registered users and guest donations.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateDonationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Donation created and processed successfully',
      content: {
        'application/json': {
          schema: CheckoutResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request or insufficient balance',
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

const getDonationRoute = createRoute({
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
            data: DonationResponseSchema,
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

const listDonationsRoute = createRoute({
  method: 'get',
  path: '/donations',
  tags: ['Donations'],
  summary: 'List donations',
  description: 'List donations with optional filters and pagination',
  request: {
    query: GetDonationsQuerySchema,
  },
  responses: {
    200: {
      description: 'List of donations',
      content: {
        'application/json': {
          schema: DonationListResponseSchema,
        },
      },
    },
  },
});

const refundDonationRoute = createRoute({
  method: 'post',
  path: '/donations/{id}/refund',
  tags: ['Donations'],
  summary: 'Refund a donation',
  description: 'Refund a completed donation (admin only)',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: RefundDonationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Donation refunded successfully',
      content: {
        'application/json': {
          schema: CheckoutResponseSchema,
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

const getCampaignDonationsRoute = createRoute({
  method: 'get',
  path: '/donations/campaign/{campaignId}',
  tags: ['Donations'],
  summary: 'Get donations for a campaign',
  description: 'Get all donations for a specific campaign',
  request: {
    params: z.object({
      campaignId: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Campaign donations',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              donations: z.array(DonationResponseSchema),
              count: z.number(),
            }),
          }),
        },
      },
    },
  },
});

const getMyDonationsRoute = createRoute({
  method: 'get',
  path: '/donations/me',
  tags: ['Donations'],
  summary: 'Get my donations',
  description: 'Get all donations made by the authenticated user',
  responses: {
    200: {
      description: 'User donations',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              donations: z.array(DonationResponseSchema),
              count: z.number(),
            }),
          }),
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

// ============================================================================
// ROUTER SETUP
// ============================================================================

export const donationsRouter = new OpenAPIHono();

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// Create donation (checkout)
donationsRouter.openapi(createDonationRoute, optionalAuth, async (c) => {
  try {
    const body = c.req.valid('json');
    const user = c.get('user');
    const isAuthenticated = c.get('isAuthenticated');

    logger.info('Creating donation', {
      campaignId: body.campaignId,
      amount: body.amount,
      isAuthenticated,
    });

    // Verify campaign exists
    const campaignCheck = await CampaignClientService.verifyCampaign(
      body.campaignId
    );

    if (!campaignCheck.exists) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Campaign not found',
          },
        },
        404
      );
    }

    if (!campaignCheck.isActive) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_ACTIVE',
            message: 'Campaign is not active',
          },
        },
        400
      );
    }

    // Prepare donation input
    const donationInput = {
      campaignId: body.campaignId,
      amount: body.amount,
      donorId: isAuthenticated ? user?.userId : undefined,
      donorName: body.donorName,
      donorEmail: body.donorEmail,
      isAnonymous: body.isAnonymous || false,
      isGuest: !isAuthenticated,
      bankAccountId: body.bankAccountId || 'bank_acc_guest',
    };

    // Process checkout
    const result = await CheckoutService.processDonation(donationInput);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: result.errorCode || 'CHECKOUT_FAILED',
            message: result.error || 'Checkout failed',
          },
        },
        400
      );
    }

    return c.json(
      {
        success: true,
        data: result.donation,
      },
      201
    );
  } catch (error) {
    logger.error('Error creating donation', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create donation',
        },
      },
      500
    );
  }
});

// Get donation by ID
donationsRouter.openapi(getDonationRoute, optionalAuth, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const user = c.get('user');
    const isAuthenticated = c.get('isAuthenticated');

    logger.info('Getting donation', { id, userId: user?.userId });

    const donation = await DonationService.getDonationById(id);

    if (!donation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Donation not found',
          },
        },
        404
      );
    }

    // Check authorization (only donor or admin can view non-anonymous donations)
    if (
      !donation.isAnonymous &&
      isAuthenticated &&
      donation.donorId !== user?.userId &&
      user?.role !== 'ADMIN'
    ) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        },
        403
      );
    }

    return c.json({
      success: true,
      data: donation,
    });
  } catch (error) {
    logger.error('Error getting donation', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get donation',
        },
      },
      500
    );
  }
});

// List donations
donationsRouter.openapi(listDonationsRoute, optionalAuth, async (c) => {
  try {
    const query = c.req.valid('query');
    const user = c.get('user');

    logger.info('Listing donations', { query, userId: user?.userId });

    const result = await DonationService.listDonations(
      {
        campaignId: query.campaignId,
        status: query.status,
      },
      {
        page: query.page,
        limit: query.limit,
      }
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error listing donations', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list donations',
        },
      },
      500
    );
  }
});

// Refund donation (admin only)
donationsRouter.openapi(refundDonationRoute, requireAuth, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const user = c.get('user');

    // Check admin role
    if (user?.role !== 'ADMIN') {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        403
      );
    }

    logger.info('Refunding donation', { id, reason: body.reason });

    const result = await CheckoutService.refundDonation(id, body.reason);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: result.errorCode || 'REFUND_FAILED',
            message: result.error || 'Refund failed',
          },
        },
        400
      );
    }

    return c.json({
      success: true,
      data: result.donation,
    });
  } catch (error) {
    logger.error('Error refunding donation', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refund donation',
        },
      },
      500
    );
  }
});

// Get campaign donations
donationsRouter.openapi(getCampaignDonationsRoute, async (c) => {
  try {
    const { campaignId } = c.req.valid('param');

    logger.info('Getting campaign donations', { campaignId });

    const donations = await DonationService.getDonationsByCampaign(campaignId);

    return c.json({
      success: true,
      data: {
        donations,
        count: donations.length,
      },
    });
  } catch (error) {
    logger.error('Error getting campaign donations', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get campaign donations',
        },
      },
      500
    );
  }
});

// Get my donations (authenticated users only)
donationsRouter.openapi(getMyDonationsRoute, requireAuth, async (c) => {
  try {
    const user = c.get('user');

    logger.info('Getting user donations', { userId: user?.userId });

    const donations = await DonationService.getDonationsByDonor(user.userId);

    return c.json({
      success: true,
      data: {
        donations,
        count: donations.length,
      },
    });
  } catch (error) {
    logger.error('Error getting user donations', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user donations',
        },
      },
      500
    );
  }
});
