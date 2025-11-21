import { Context, Next } from 'hono';
import { createLogger } from '@care-for-all/shared-logger';
import * as jwt from 'jsonwebtoken';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: 'info',
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============================================================================
// TYPES
// ============================================================================

export interface AccessTokenPayload {
  userId: string;
  email: string | null;
  role: string;
  isGuest: boolean;
}

export interface AuthContext {
  user: AccessTokenPayload;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to verify JWT access token
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      logger.warn('Missing Authorization header');
      return c.json(
        {
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization header is required',
          },
        },
        401
      );
    }

    // Extract Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Invalid Authorization header format');
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Authorization header must be in format: Bearer <token>',
          },
        },
        401
      );
    }

    const token = parts[1];

    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const payload = decoded as AccessTokenPayload;

    // Store user info in context
    c.set('user', payload);

    logger.debug('Token verified successfully', { userId: payload.userId });

    await next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token', { error: error.message });
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        },
        401
      );
    }

    logger.error('Unexpected error in auth middleware', error);
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
}

/**
 * Optional auth middleware - doesn't fail if token is missing
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        try {
          if (JWT_SECRET) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const payload = decoded as AccessTokenPayload;
            c.set('user', payload);
          }
        } catch (error) {
          // Ignore token errors in optional auth
          logger.debug('Optional auth: invalid token ignored');
        }
      }
    }
    await next();
  } catch (error) {
    // Continue even if there's an error
    await next();
  }
}

/**
 * Helper function to get user from context
 */
export function getUser(c: Context): AccessTokenPayload | null {
  return c.get('user') || null;
}

/**
 * Helper function to require user (throws if not authenticated)
 */
export function requireUser(c: Context): AccessTokenPayload {
  const user = c.get('user');
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

