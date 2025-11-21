import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { UserService } from '../services/user.service';
import { authMiddleware, requireUser } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { createLogger } from '@care-for-all/shared-logger';
import { AuthError, ValidationError } from '../types/auth.types';
import {
  UpdateProfileRequestSchema,
  UpdateRoleRequestSchema,
  ListUsersQuerySchema,
  UserResponseSchema,
  UsersListResponseSchema,
  UserStatsResponseSchema,
} from '../schemas/user.schema';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'auth-service',
  minLevel: 'info',
});

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

export const getMeRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['User'],
  summary: 'Get current user profile',
  description: 'Get the profile of the authenticated user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
  },
});

export const updateMeRoute = createRoute({
  method: 'patch',
  path: '/me',
  tags: ['User'],
  summary: 'Update current user profile',
  description: 'Update the profile of the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateProfileRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated successfully',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
  },
});

export const listUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  tags: ['User', 'Admin'],
  summary: 'List all users (Admin only)',
  description: 'Get a paginated list of all users',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListUsersQuerySchema,
  },
  responses: {
    200: {
      description: 'Users retrieved successfully',
      content: {
        'application/json': {
          schema: UsersListResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: UsersListResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - Admin access required',
      content: {
        'application/json': {
          schema: UsersListResponseSchema,
        },
      },
    },
  },
});

export const updateUserRoleRoute = createRoute({
  method: 'patch',
  path: '/users/{id}/role',
  tags: ['User', 'Admin'],
  summary: 'Update user role (Admin only)',
  description: 'Update the role of a specific user',
  security: [{ bearerAuth: [] }],
  request: {
    params: {
      id: {
        type: 'string',
        description: 'User ID',
      },
    },
    body: {
      content: {
        'application/json': {
          schema: UpdateRoleRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User role updated successfully',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - Admin access required',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
  },
});

export const getUserStatsRoute = createRoute({
  method: 'get',
  path: '/users/stats',
  tags: ['User', 'Admin'],
  summary: 'Get user statistics (Admin only)',
  description: 'Get statistics about users in the system',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User statistics retrieved successfully',
      content: {
        'application/json': {
          schema: UserStatsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: UserStatsResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - Admin access required',
      content: {
        'application/json': {
          schema: UserStatsResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export const userRoutes = new OpenAPIHono();

// Get current user profile
userRoutes.openapi(getMeRoute, authMiddleware, async (c) => {
  try {
    const currentUser = requireUser(c);
    const user = await UserService.findById(currentUser.userId);

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        404
      );
    }

    const safeUser = UserService.toSafeUser(user);

    return c.json({
      success: true,
      data: {
        ...safeUser,
        createdAt: safeUser.createdAt.toISOString(),
        updatedAt: safeUser.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get profile error', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500
    );
  }
});

// Update current user profile
userRoutes.openapi(updateMeRoute, authMiddleware, async (c) => {
  try {
    const currentUser = requireUser(c);
    const body = c.req.valid('json');

    const user = await UserService.updateProfile(currentUser.userId, body);
    const safeUser = UserService.toSafeUser(user);

    logger.info('Profile updated', { userId: user.id });

    return c.json({
      success: true,
      data: {
        ...safeUser,
        createdAt: safeUser.createdAt.toISOString(),
        updatedAt: safeUser.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthError) {
      return c.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.statusCode
      );
    }
    logger.error('Update profile error', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500
    );
  }
});

// List all users (Admin only)
userRoutes.openapi(listUsersRoute, authMiddleware, requireAdmin, async (c) => {
  try {
    const query = c.req.valid('query');
    const result = await UserService.listUsers(query.page, query.limit);

    return c.json({
      success: true,
      data: {
        users: result.users.map(user => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('List users error', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500
    );
  }
});

// Update user role (Admin only)
userRoutes.openapi(updateUserRoleRoute, authMiddleware, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const user = await UserService.updateRole(id, body.role);
    const safeUser = UserService.toSafeUser(user);

    logger.info('User role updated', { userId: id, newRole: body.role });

    return c.json({
      success: true,
      data: {
        ...safeUser,
        createdAt: safeUser.createdAt.toISOString(),
        updatedAt: safeUser.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return c.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.statusCode
      );
    }
    logger.error('Update user role error', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500
    );
  }
});

// Get user statistics (Admin only)
userRoutes.openapi(getUserStatsRoute, authMiddleware, requireAdmin, async (c) => {
  try {
    const stats = await UserService.getStatistics();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get user stats error', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500
    );
  }
});

