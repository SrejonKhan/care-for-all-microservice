import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { RefreshToken } from '../models';
import { createLogger } from '@care-for-all/shared-logger';
import {
    AccessTokenPayload,
    RefreshTokenPayload,
    TokenPair,
    AuthError,
    UserRole,
} from '../types/auth.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
    serviceName: 'auth-service',
    minLevel: 'info',
});

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Convert expiry strings to seconds for response
const EXPIRY_MAP: Record<string, number> = {
    '15m': 15 * 60,
    '1h': 60 * 60,
    '24h': 24 * 60 * 60,
    '7d': 7 * 24 * 60 * 60,
};

// ============================================================================
// TOKEN SERVICE
// ============================================================================

export class TokenService {
    /**
     * Generate access token (short-lived)
     * @param payload Token payload
     * @returns JWT access token
     */
    static generateAccessToken(payload: AccessTokenPayload): string {
        try {
            const token = jwt.sign(payload as any, JWT_SECRET, {
                expiresIn: JWT_ACCESS_EXPIRES_IN,
                issuer: 'care-for-all-auth',
                audience: 'care-for-all-api',
            } as jwt.SignOptions);

            logger.debug('Access token generated', { userId: payload.userId });
            return token;
        } catch (error) {
            logger.error('Error generating access token', error);
            throw new AuthError('Failed to generate access token', 'TOKEN_GENERATION_FAILED', 500);
        }
    }

    /**
     * Generate refresh token (long-lived) and store in database
     * @param userId User ID
     * @returns JWT refresh token
     */
    static async generateRefreshToken(userId: string): Promise<string> {
        try {
            // Create refresh token record in database
            const refreshTokenRecord = await RefreshToken.create({
                userId,
                tokenHash: crypto.randomBytes(32).toString('hex'),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            });

            // Generate JWT with token ID
            const payload: RefreshTokenPayload = {
                userId,
                tokenId: refreshTokenRecord._id.toString(),
            };

            const token = jwt.sign(payload as any, JWT_SECRET, {
                expiresIn: JWT_REFRESH_EXPIRES_IN,
                issuer: 'care-for-all-auth',
                audience: 'care-for-all-api',
            } as jwt.SignOptions);

            logger.info('Refresh token generated', { userId, tokenId: refreshTokenRecord._id.toString() });
            return token;
        } catch (error) {
            logger.error('Error generating refresh token', error);
            throw new AuthError('Failed to generate refresh token', 'TOKEN_GENERATION_FAILED', 500);
        }
    }

    /**
     * Generate both access and refresh tokens
     * @param userId User ID
     * @param email User email
     * @param role User role
     * @param isGuest Whether user is guest
     * @returns Token pair
     */
    static async generateTokenPair(
        userId: string,
        email: string | null,
        role: UserRole,
        isGuest: boolean
    ): Promise<TokenPair> {
        const accessToken = this.generateAccessToken({ userId, email, role, isGuest });
        const refreshToken = await this.generateRefreshToken(userId);

        return {
            accessToken,
            refreshToken,
            expiresIn: EXPIRY_MAP[JWT_ACCESS_EXPIRES_IN] || 900, // Default 15 minutes
        };
    }

    /**
     * Verify and decode access token
     * @param token JWT access token
     * @returns Decoded payload
     */
    static verifyAccessToken(token: string): AccessTokenPayload {
        try {
            const decoded = jwt.verify(token, JWT_SECRET, {
                issuer: 'care-for-all-auth',
                audience: 'care-for-all-api',
            }) as AccessTokenPayload;

            logger.debug('Access token verified', { userId: decoded.userId });
            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger.warn('Access token expired');
                throw new AuthError('Access token expired', 'TOKEN_EXPIRED', 401);
            }
            if (error instanceof jwt.JsonWebTokenError) {
                logger.warn('Invalid access token');
                throw new AuthError('Invalid access token', 'INVALID_TOKEN', 401);
            }
            logger.error('Error verifying access token', error);
            throw new AuthError('Token verification failed', 'TOKEN_VERIFICATION_FAILED', 401);
        }
    }

    /**
     * Verify and decode refresh token
     * @param token JWT refresh token
     * @returns Decoded payload
     */
    static verifyRefreshToken(token: string): RefreshTokenPayload {
        try {
            const decoded = jwt.verify(token, JWT_SECRET, {
                issuer: 'care-for-all-auth',
                audience: 'care-for-all-api',
            }) as RefreshTokenPayload;

            logger.debug('Refresh token verified', { userId: decoded.userId, tokenId: decoded.tokenId });
            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger.warn('Refresh token expired');
                throw new AuthError('Refresh token expired', 'TOKEN_EXPIRED', 401);
            }
            if (error instanceof jwt.JsonWebTokenError) {
                logger.warn('Invalid refresh token');
                throw new AuthError('Invalid refresh token', 'INVALID_TOKEN', 401);
            }
            logger.error('Error verifying refresh token', error);
            throw new AuthError('Token verification failed', 'TOKEN_VERIFICATION_FAILED', 401);
        }
    }

    /**
     * Check if refresh token is valid in database
     * @param tokenId Token ID from JWT
     * @returns True if valid, false otherwise
     */
    static async isRefreshTokenValid(tokenId: string): Promise<boolean> {
        try {
            const token = await RefreshToken.findById(tokenId);

            if (!token) {
                logger.warn('Refresh token not found in database', { tokenId });
                return false;
            }

            if (token.revoked) {
                logger.warn('Refresh token has been revoked', { tokenId });
                return false;
            }

            if (token.expiresAt < new Date()) {
                logger.warn('Refresh token has expired', { tokenId });
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Error checking refresh token validity', error);
            return false;
        }
    }

    /**
     * Revoke a refresh token
     * @param tokenId Token ID
     */
    static async revokeRefreshToken(tokenId: string): Promise<void> {
        try {
            await RefreshToken.findByIdAndUpdate(tokenId, { revoked: true });
            logger.info('Refresh token revoked', { tokenId });
        } catch (error) {
            logger.error('Error revoking refresh token', error);
            throw new AuthError('Failed to revoke token', 'TOKEN_REVOCATION_FAILED', 500);
        }
    }

    /**
     * Revoke all refresh tokens for a user
     * @param userId User ID
     */
    static async revokeAllUserTokens(userId: string): Promise<void> {
        try {
            await RefreshToken.updateMany(
                { userId, revoked: false },
                { revoked: true }
            );

            logger.info('All user tokens revoked', { userId });
        } catch (error) {
            logger.error('Error revoking all user tokens', error);
            throw new AuthError('Failed to revoke tokens', 'TOKEN_REVOCATION_FAILED', 500);
        }
    }

    /**
     * Clean up expired tokens from database
     */
    static async cleanupExpiredTokens(): Promise<void> {
        try {
            const result = await RefreshToken.deleteMany({
                expiresAt: { $lt: new Date() },
            });

            logger.info('Expired tokens cleaned up', { count: result.deletedCount });
        } catch (error) {
            logger.error('Error cleaning up expired tokens', error);
        }
    }
}
