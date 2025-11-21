import { createLogger } from '@care-for-all/shared-logger';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { UserService } from './user.service';
import { AuthResponse, AuthError, ValidationError, UserRole } from '../types/auth.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
    serviceName: 'auth-service',
    minLevel: 'info',
});

// ============================================================================
// AUTH SERVICE
// ============================================================================

export class AuthService {
    /**
     * Register a new user
     * @param email User email
     * @param password User password
     * @param name User name
     * @returns Auth response with user and tokens
     */
    static async register(
        email: string,
        password: string,
        name: string
    ): Promise<AuthResponse> {
        try {
            // Validate password
            const passwordValidation = PasswordService.validatePassword(password);
            if (!passwordValidation.valid) {
                throw new ValidationError(
                    passwordValidation.error || 'Invalid password',
                    'INVALID_PASSWORD'
                );
            }

            // Hash password
            const passwordHash = await PasswordService.hash(password);

            // Create user
            const user = await UserService.createUser({
                email,
                passwordHash,
                name,
                role: UserRole.USER,
            });

            // Generate tokens
            const tokens = await TokenService.generateTokenPair(
                user.id,
                user.email,
                user.role,
                user.isGuest
            );

            logger.info('User registered successfully', { userId: user.id, email });

            return {
                user: UserService.toSafeUser(user),
                tokens,
            };
        } catch (error) {
            if (error instanceof ValidationError || error instanceof AuthError) {
                throw error;
            }
            logger.error('Registration failed', error);
            throw new AuthError('Registration failed', 'REGISTRATION_FAILED', 500);
        }
    }

    /**
     * Login user with email and password
     * @param email User email
     * @param password User password
     * @returns Auth response with user and tokens
     */
    static async login(email: string, password: string): Promise<AuthResponse> {
        try {
            // Find user by email
            const user = await UserService.findByEmail(email);
            if (!user) {
                logger.warn('Login attempt with non-existent email', { email });
                throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
            }

            // Check if user is a guest (no password)
            if (user.isGuest || !user.passwordHash) {
                logger.warn('Login attempt for guest user', { userId: user.id });
                throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
            }

            // Verify password
            const isPasswordValid = await PasswordService.verify(password, user.passwordHash);
            if (!isPasswordValid) {
                logger.warn('Login attempt with invalid password', { email, userId: user.id });
                throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
            }

            // Generate tokens
            const tokens = await TokenService.generateTokenPair(
                user.id,
                user.email,
                user.role,
                user.isGuest
            );

            logger.info('User logged in successfully', { userId: user.id, email });

            return {
                user: UserService.toSafeUser(user),
                tokens,
            };
        } catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            logger.error('Login failed', error);
            throw new AuthError('Login failed', 'LOGIN_FAILED', 500);
        }
    }

    /**
     * Create a guest user
     * @param name Guest name
     * @returns Auth response with guest user and tokens
     */
    static async createGuest(name: string): Promise<AuthResponse> {
        try {
            // Create guest user
            const user = await UserService.createGuestUser(name);

            // Generate tokens
            const tokens = await TokenService.generateTokenPair(
                user.id,
                user.email,
                user.role,
                user.isGuest
            );

            logger.info('Guest user created successfully', { userId: user.id, name });

            return {
                user: UserService.toSafeUser(user),
                tokens,
            };
        } catch (error) {
            logger.error('Guest creation failed', error);
            throw new AuthError('Failed to create guest user', 'GUEST_CREATION_FAILED', 500);
        }
    }

    /**
     * Refresh access token using refresh token
     * @param refreshToken Refresh token
     * @returns Auth response with new tokens
     */
    static async refresh(refreshToken: string): Promise<AuthResponse> {
        try {
            // Verify refresh token
            const payload = TokenService.verifyRefreshToken(refreshToken);

            // Check if token is valid in database
            const isValid = await TokenService.isRefreshTokenValid(payload.tokenId);
            if (!isValid) {
                throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
            }

            // Get user
            const user = await UserService.findById(payload.userId);
            if (!user) {
                throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
            }

            // Revoke old refresh token (token rotation)
            await TokenService.revokeRefreshToken(payload.tokenId);

            // Generate new tokens
            const tokens = await TokenService.generateTokenPair(
                user.id,
                user.email,
                user.role,
                user.isGuest
            );

            logger.info('Tokens refreshed successfully', { userId: user.id });

            return {
                user: UserService.toSafeUser(user),
                tokens,
            };
        } catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            logger.error('Token refresh failed', error);
            throw new AuthError('Token refresh failed', 'REFRESH_FAILED', 500);
        }
    }

    /**
     * Logout user by revoking refresh token
     * @param refreshToken Refresh token
     */
    static async logout(refreshToken: string): Promise<void> {
        try {
            // Verify refresh token
            const payload = TokenService.verifyRefreshToken(refreshToken);

            // Revoke token
            await TokenService.revokeRefreshToken(payload.tokenId);

            logger.info('User logged out successfully', { userId: payload.userId });
        } catch (error) {
            // Even if token is invalid, we consider logout successful
            logger.warn('Logout with invalid token', error);
        }
    }

    /**
     * Logout from all devices by revoking all refresh tokens
     * @param userId User ID
     */
    static async logoutAll(userId: string): Promise<void> {
        try {
            await TokenService.revokeAllUserTokens(userId);
            logger.info('User logged out from all devices', { userId });
        } catch (error) {
            logger.error('Logout all failed', error);
            throw new AuthError('Failed to logout from all devices', 'LOGOUT_ALL_FAILED', 500);
        }
    }

    /**
     * Claim guest account by providing email and password
     * @param userId Guest user ID
     * @param email Email
     * @param password Password
     * @returns Auth response with updated user and new tokens
     */
    static async claimGuestAccount(
        userId: string,
        email: string,
        password: string
    ): Promise<AuthResponse> {
        try {
            // Validate password
            const passwordValidation = PasswordService.validatePassword(password);
            if (!passwordValidation.valid) {
                throw new ValidationError(
                    passwordValidation.error || 'Invalid password',
                    'INVALID_PASSWORD'
                );
            }

            // Hash password
            const passwordHash = await PasswordService.hash(password);

            // Claim account
            const user = await UserService.claimGuestAccount(userId, email, passwordHash);

            // Revoke all existing tokens
            await TokenService.revokeAllUserTokens(userId);

            // Generate new tokens
            const tokens = await TokenService.generateTokenPair(
                user.id,
                user.email,
                user.role,
                user.isGuest
            );

            logger.info('Guest account claimed successfully', { userId, email });

            return {
                user: UserService.toSafeUser(user),
                tokens,
            };
        } catch (error) {
            if (error instanceof ValidationError || error instanceof AuthError) {
                throw error;
            }
            logger.error('Guest account claim failed', error);
            throw new AuthError('Failed to claim guest account', 'CLAIM_FAILED', 500);
        }
    }

    /**
     * Verify access token (for other services)
     * @param accessToken Access token
     * @returns User ID and role
     */
    static verifyToken(accessToken: string): {
        userId: string;
        email: string | null;
        role: UserRole;
        isGuest: boolean;
    } {
        try {
            const payload = TokenService.verifyAccessToken(accessToken);
            return {
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
                isGuest: payload.isGuest,
            };
        } catch (error) {
            throw error; // Re-throw AuthError from TokenService
        }
    }
}

