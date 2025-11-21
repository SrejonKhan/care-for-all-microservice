import { Context, Next } from 'hono';
import { createLogger } from '@care-for-all/shared-logger';
import { TokenVerifier } from '@care-for-all/shared-auth';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: 'info',
});

// Initialize token verifier on module load
TokenVerifier.initialize();

// ============================================================================
// TYPES
// ============================================================================

export interface AccessTokenPayload {
  userId: string;
  email?: string;
  role: string;
  iat: number;
  exp: number;
}

// ============================================================================
// AUTH MIDDLEWARE (OPTIONAL)
// ============================================================================

/**
 * Optional authentication middleware
 * Extracts user info if token is present, but doesn't require it
 */
export async function optionalAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue as guest
      c.set('user', null);
      c.set('isAuthenticated', false);
      await next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = TokenVerifier.verifyAccessTokenOptional(token);
      
      if (payload) {
        // Set user context
        c.set('user', {
          userId: payload.userId,
          email: payload.email || undefined,
          role: payload.role,
        });
        c.set('isAuthenticated', true);

        logger.info('User authenticated', {
          userId: payload.userId,
          role: payload.role,
        });
      } else {
        // Invalid token, treat as guest
        c.set('user', null);
        c.set('isAuthenticated', false);
      }
    } catch (jwtError) {
      // Invalid token, treat as guest
      logger.warn('Invalid JWT token, treating as guest', {
        error: (jwtError as Error).message,
      });
      c.set('user', null);
      c.set('isAuthenticated', false);
    }

    await next();
  } catch (error) {
    logger.error('Error in optional auth middleware', {
      error: (error as Error).message,
    });

    c.set('user', null);
    c.set('isAuthenticated', false);
    await next();
  }
}

/**
 * Required authentication middleware
 * Requires a valid token
 */
export async function requireAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authorization token required',
          },
        },
        401 as any
      );
    }

    const token = authHeader.substring(7);

    try {
      const payload = TokenVerifier.verifyAccessToken(token);

      // Set user context
      c.set('user', {
        userId: payload.userId,
        email: payload.email || undefined,
        role: payload.role,
      });
      c.set('isAuthenticated', true);

      logger.info('User authenticated', {
        userId: payload.userId,
        role: payload.role,
      });

      await next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token', {
        error: (jwtError as Error).message,
      });

      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        },
        401 as any
      );
    }
  } catch (error) {
    logger.error('Error in require auth middleware', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication error',
        },
      },
      500 as any
    );
  }
}

