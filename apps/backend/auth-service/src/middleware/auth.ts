import { Context, Next } from 'hono';
import { TokenService } from '../services/token.service';
import { AuthError, AccessTokenPayload } from '../types/auth.types';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
    serviceName: 'auth-service',
    minLevel: 'info',
});

// ============================================================================
// TYPES
// ============================================================================

// Extend Hono context to include user info
export interface AuthContext {
    user: AccessTokenPayload;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to verify JWT access token
 * Extracts token from Authorization header and verifies it
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

        // Verify token
        const payload = TokenService.verifyAccessToken(token);

        // Store user info in context
        c.set('user', payload);

        logger.debug('Token verified successfully', { userId: payload.userId });

        await next();
    } catch (error) {
        if (error instanceof AuthError) {
            logger.warn('Token verification failed', { code: error.code });
            return c.json(
                {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                    },
                },
                error.statusCode as any
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
            500 as any
        );
    }
}

/**
 * Optional auth middleware - doesn't fail if token is missing
 * Useful for endpoints that work for both authenticated and unauthenticated users
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
    try {
        const authHeader = c.req.header('Authorization');
        if (authHeader) {
            const parts = authHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                const token = parts[1];
                try {
                    const payload = TokenService.verifyAccessToken(token);
                    c.set('user', payload);
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
        throw new AuthError('Authentication required', 'AUTH_REQUIRED', 401);
    }
    return user;
}

