import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { AuthService } from '../services/auth.service';
import { authMiddleware, requireUser } from '../middleware/auth';
import { createLogger } from '@care-for-all/shared-logger';
import { AuthError, ValidationError } from '../types/auth.types';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  GuestRequestSchema,
  RefreshRequestSchema,
  ClaimGuestRequestSchema,
  VerifyTokenRequestSchema,
  AuthResponseSchema,
  VerifyTokenResponseSchema,
  MessageResponseSchema,
} from '../schemas/auth.schema';

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

export const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Authentication'],
  summary: 'Register a new user',
  description: 'Create a new user account with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    409: {
      description: 'User already exists',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
  },
});

export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Authentication'],
  summary: 'User login',
  description: 'Authenticate a user with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
  },
});

export const guestRoute = createRoute({
  method: 'post',
  path: '/guest',
  tags: ['Authentication'],
  summary: 'Create guest user',
  description: 'Create a guest user for donations without registration',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GuestRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Guest user created successfully',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
  },
});

export const refreshRoute = createRoute({
  method: 'post',
  path: '/refresh',
  tags: ['Authentication'],
  summary: 'Refresh access token',
  description: 'Get a new access token using refresh token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RefreshRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Token refreshed successfully',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid or expired refresh token',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
  },
});

export const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Authentication'],
  summary: 'Logout user',
  description: 'Revoke refresh token and logout user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RefreshRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
    },
  },
});

export const claimGuestRoute = createRoute({
  method: 'post',
  path: '/guest/claim',
  tags: ['Authentication'],
  summary: 'Claim guest account',
  description: 'Convert guest user to registered user',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ClaimGuestRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Guest account claimed successfully',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
  },
});

export const verifyTokenRoute = createRoute({
  method: 'post',
  path: '/verify-token',
  tags: ['Authentication'],
  summary: 'Verify access token',
  description: 'Verify JWT token and return user info (for other services)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: VerifyTokenRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Token is valid',
      content: {
        'application/json': {
          schema: VerifyTokenResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid token',
      content: {
        'application/json': {
          schema: VerifyTokenResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export const authRoutes = new OpenAPIHono();

// Register
authRoutes.openapi(registerRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const result = await AuthService.register(body.email, body.password, body.name);

    logger.info('User registered', { userId: result.user.id, email: result.user.email });

    return c.json(
      {
        success: true,
        data: {
          user: {
            ...result.user,
            createdAt: result.user.createdAt.toISOString(),
            updatedAt: result.user.updatedAt.toISOString(),
          },
          tokens: result.tokens,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof ValidationError) {
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
    logger.error('Registration error', error);
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

// Login
authRoutes.openapi(loginRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const result = await AuthService.login(body.email, body.password);

    logger.info('User logged in', { userId: result.user.id, email: result.user.email });

    return c.json({
      success: true,
      data: {
        user: {
          ...result.user,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString(),
        },
        tokens: result.tokens,
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
    logger.error('Login error', error);
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

// Create guest
authRoutes.openapi(guestRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const result = await AuthService.createGuest(body.name);

    logger.info('Guest user created', { userId: result.user.id });

    return c.json(
      {
        success: true,
        data: {
          user: {
            ...result.user,
            createdAt: result.user.createdAt.toISOString(),
            updatedAt: result.user.updatedAt.toISOString(),
          },
          tokens: result.tokens,
        },
      },
      201
    );
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
    logger.error('Guest creation error', error);
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

// Refresh token
authRoutes.openapi(refreshRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const result = await AuthService.refresh(body.refreshToken);

    logger.info('Token refreshed', { userId: result.user.id });

    return c.json({
      success: true,
      data: {
        user: {
          ...result.user,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString(),
        },
        tokens: result.tokens,
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
    logger.error('Token refresh error', error);
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

// Logout
authRoutes.openapi(logoutRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    await AuthService.logout(body.refreshToken);

    return c.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    logger.error('Logout error', error);
    // Always return success for logout
    return c.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  }
});

// Claim guest account
authRoutes.openapi(claimGuestRoute, authMiddleware, async (c) => {
  try {
    const user = requireUser(c);
    const body = c.req.valid('json');

    const result = await AuthService.claimGuestAccount(user.userId, body.email, body.password);

    logger.info('Guest account claimed', { userId: result.user.id, email: result.user.email });

    return c.json({
      success: true,
      data: {
        user: {
          ...result.user,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString(),
        },
        tokens: result.tokens,
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
    logger.error('Claim guest account error', error);
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

// Verify token
authRoutes.openapi(verifyTokenRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const result = AuthService.verifyToken(body.token);

    return c.json({
      success: true,
      data: result,
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
    logger.error('Token verification error', error);
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
