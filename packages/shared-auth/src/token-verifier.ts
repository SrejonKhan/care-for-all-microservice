import * as jwt from 'jsonwebtoken';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'shared-auth',
  minLevel: 'info',
});

// ============================================================================
// TYPES
// ============================================================================

export interface AccessTokenPayload {
  userId: string;
  email: string | null;
  role: string;
  isGuest: boolean;
  iat?: number;
  exp?: number;
}

// ============================================================================
// TOKEN VERIFIER
// ============================================================================

/**
 * Shared token verification utility using RSA public key
 * This can be used by all services to verify JWT tokens
 */
export class TokenVerifier {
  private static publicKey: string | null = null;

  /**
   * Initialize the public key from environment variable
   * Should be called once at service startup
   */
  static initialize(publicKey?: string): void {
    const key = publicKey || process.env.JWT_PUBLIC_KEY;

    if (!key) {
      throw new Error(
        'JWT_PUBLIC_KEY is required for token verification. ' +
        'Set it in environment variables or pass it to initialize().'
      );
    }

    // Handle newlines in environment variable (common when using multiline strings)
    this.publicKey = key.replace(/\\n/g, '\n');

    logger.info('Token verifier initialized with RSA public key');
  }

  /**
   * Verify and decode JWT access token using RSA public key
   * @param token JWT access token
   * @returns Decoded payload
   * @throws Error if token is invalid or expired
   */
  static verifyAccessToken(token: string): AccessTokenPayload {
    if (!this.publicKey) {
      this.initialize();
    }

    try {
      const decoded = jwt.verify(token, this.publicKey!, {
        algorithms: ['RS256'], // RSA with SHA-256
        issuer: 'care-for-all-auth',
        audience: 'care-for-all-api',
      }) as AccessTokenPayload;

      logger.debug('Access token verified', { userId: decoded.userId });
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Access token expired');
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token', { error: error.message });
        throw new Error('Invalid access token');
      }
      logger.error('Error verifying access token', error);
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify token without throwing (for optional auth)
   * @param token JWT access token
   * @returns Decoded payload or null if invalid
   */
  static verifyAccessTokenOptional(token: string): AccessTokenPayload | null {
    try {
      return this.verifyAccessToken(token);
    } catch (error) {
      logger.debug('Optional token verification failed', {
        error: (error as Error).message,
      });
      return null;
    }
  }
}

