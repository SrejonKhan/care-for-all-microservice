import { Context, Next } from 'hono';
import * as jwt from 'jsonwebtoken';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'payment-service',
  required: { database: false, rabbitmq: false, otel: false },
});

const logger = createLogger({
  serviceName: 'payment-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// ============================================================================
// TYPES
// ============================================================================

export interface AccessTokenPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

/**
 * Optional authentication middleware - allows requests without tokens
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without user context
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET!) as AccessTokenPayload;

    c.set('user', {
      userId: decoded.userId,
      role: decoded.role,
    });

    logger.debug('User authenticated (optional)', {
      userId: decoded.userId,
      role: decoded.role,
    });
  } catch (error) {
    // Invalid token, but continue anyway since auth is optional
    logger.warn('Invalid token in optional auth', {
      error: (error as Error).message,
    });
  }

  await next();
}

/**
 * Required authentication middleware
 */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header');
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header',
        },
      },
      401 as any
    );
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET!) as AccessTokenPayload;

    c.set('user', {
      userId: decoded.userId,
      role: decoded.role,
    });

    logger.debug('User authenticated', {
      userId: decoded.userId,
      role: decoded.role,
    });

    await next();
  } catch (error) {
    logger.warn('Token verification failed', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      },
      401 as any
    );
  }
}

