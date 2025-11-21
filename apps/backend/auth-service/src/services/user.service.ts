import { User, UserRole, IUser } from '../models';
import { createLogger } from '@care-for-all/shared-logger';
import { SafeUser, AuthError, ValidationError } from '../types/auth.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
    serviceName: 'auth-service',
    minLevel: 'info',
});

// ============================================================================
// USER SERVICE
// ============================================================================

export class UserService {
    /**
     * Convert User model to SafeUser (without password hash)
     * @param user User from database
     * @returns SafeUser
     */
    static toSafeUser(user: IUser): SafeUser {
        return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isGuest: user.isGuest,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    /**
     * Find user by ID
     * @param id User ID
     * @returns User or null
     */
    static async findById(id: string): Promise<IUser | null> {
        try {
            const user = await User.findById(id);
            return user;
        } catch (error) {
            logger.error('Error finding user by ID', error, { userId: id });
            throw new AuthError('Failed to find user', 'USER_LOOKUP_FAILED', 500);
        }
    }

    /**
     * Find user by email
     * @param email User email
     * @returns User or null
     */
    static async findByEmail(email: string): Promise<IUser | null> {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            return user;
        } catch (error) {
            logger.error('Error finding user by email', error, { email });
            throw new AuthError('Failed to find user', 'USER_LOOKUP_FAILED', 500);
        }
    }

    /**
     * Create a new user
     * @param data User creation data
     * @returns Created user
     */
    static async createUser(data: {
        email: string;
        passwordHash: string;
        name: string;
        role?: UserRole;
    }): Promise<IUser> {
        try {
            // Check if user already exists
            const existingUser = await this.findByEmail(data.email);
            if (existingUser) {
                throw new ValidationError('User with this email already exists', 'USER_EXISTS', 409);
            }

            const user = await User.create({
                email: data.email.toLowerCase(),
                passwordHash: data.passwordHash,
                name: data.name,
                role: data.role || UserRole.USER,
                isGuest: false,
                emailVerified: false,
            });

            logger.info('User created', { userId: user._id.toString(), email: user.email });
            return user;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error('Error creating user', error);
            throw new AuthError('Failed to create user', 'USER_CREATION_FAILED', 500);
        }
    }

    /**
     * Create a guest user (no email/password)
     * @param name Guest name
     * @returns Created guest user
     */
    static async createGuestUser(name: string): Promise<IUser> {
        try {
            const user = await User.create({
                name,
                role: UserRole.USER,
                isGuest: true,
                emailVerified: false,
            });

            logger.info('Guest user created', { userId: user._id.toString(), name });
            return user;
        } catch (error) {
            logger.error('Error creating guest user', error);
            throw new AuthError('Failed to create guest user', 'GUEST_CREATION_FAILED', 500);
        }
    }

    /**
     * Convert guest user to registered user
     * @param userId Guest user ID
     * @param email Email
     * @param passwordHash Password hash
     * @returns Updated user
     */
    static async claimGuestAccount(
        userId: string,
        email: string,
        passwordHash: string
    ): Promise<IUser> {
        try {
            // Verify user is a guest
            const user = await this.findById(userId);
            if (!user) {
                throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
            }

            if (!user.isGuest) {
                throw new ValidationError('User is not a guest', 'NOT_GUEST_USER', 400);
            }

            // Check if email is already taken
            const existingUser = await this.findByEmail(email);
            if (existingUser) {
                throw new ValidationError('Email already in use', 'EMAIL_IN_USE', 409);
            }

            // Update user
            user.email = email.toLowerCase();
            user.passwordHash = passwordHash;
            user.isGuest = false;
            await user.save();

            logger.info('Guest account claimed', { userId: user._id.toString(), email });
            return user;
        } catch (error) {
            if (error instanceof AuthError || error instanceof ValidationError) {
                throw error;
            }
            logger.error('Error claiming guest account', error);
            throw new AuthError('Failed to claim guest account', 'CLAIM_FAILED', 500);
        }
    }

    /**
     * Update user profile
     * @param userId User ID
     * @param data Update data
     * @returns Updated user
     */
    static async updateProfile(
        userId: string,
        data: { name?: string; email?: string }
    ): Promise<IUser> {
        try {
            // If email is being updated, check if it's available
            if (data.email) {
                const existingUser = await this.findByEmail(data.email);
                if (existingUser && existingUser._id.toString() !== userId) {
                    throw new ValidationError('Email already in use', 'EMAIL_IN_USE', 409);
                }
            }

            const updateData: any = {};
            if (data.name) updateData.name = data.name;
            if (data.email) {
                updateData.email = data.email.toLowerCase();
                updateData.emailVerified = false;
            }

            const user = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!user) {
                throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
            }

            logger.info('User profile updated', { userId });
            return user;
        } catch (error) {
            if (error instanceof ValidationError || error instanceof AuthError) {
                throw error;
            }
            logger.error('Error updating user profile', error);
            throw new AuthError('Failed to update profile', 'UPDATE_FAILED', 500);
        }
    }

    /**
     * Update user role (admin only)
     * @param userId User ID
     * @param role New role
     * @returns Updated user
     */
    static async updateRole(userId: string, role: UserRole): Promise<IUser> {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { role },
                { new: true, runValidators: true }
            );

            if (!user) {
                throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
            }

            logger.info('User role updated', { userId, role });
            return user;
        } catch (error) {
            logger.error('Error updating user role', error);
            throw new AuthError('Failed to update role', 'UPDATE_FAILED', 500);
        }
    }

    /**
     * List all users (admin only)
     * @param page Page number (1-indexed)
     * @param limit Items per page
     * @returns Users and pagination info
     */
    static async listUsers(page: number = 1, limit: number = 20): Promise<{
        users: SafeUser[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        try {
            const skip = (page - 1) * limit;

            const [users, total] = await Promise.all([
                User.find()
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                User.countDocuments(),
            ]);

            return {
                users: users.map(user => this.toSafeUser(user)),
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            logger.error('Error listing users', error);
            throw new AuthError('Failed to list users', 'LIST_FAILED', 500);
        }
    }

    /**
     * Delete user (soft delete by revoking all tokens)
     * @param userId User ID
     */
    static async deleteUser(userId: string): Promise<void> {
        try {
            // Import RefreshToken here to avoid circular dependency
            const { RefreshToken } = await import('../models');

            // In a production system, you might want to soft delete or anonymize
            // For now, we'll just revoke all tokens
            await RefreshToken.updateMany(
                { userId },
                { revoked: true }
            );

            logger.info('User deleted (tokens revoked)', { userId });
        } catch (error) {
            logger.error('Error deleting user', error);
            throw new AuthError('Failed to delete user', 'DELETE_FAILED', 500);
        }
    }

    /**
     * Get user statistics
     * @returns User statistics
     */
    static async getStatistics(): Promise<{
        totalUsers: number;
        totalGuests: number;
        totalRegistered: number;
        usersByRole: Record<UserRole, number>;
    }> {
        try {
            const [totalUsers, totalGuests, usersByRole] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ isGuest: true }),
                User.aggregate([
                    { $group: { _id: '$role', count: { $sum: 1 } } },
                ]),
            ]);

            const roleCount: Record<UserRole, number> = {
                USER: 0,
                CAMPAIGN_OWNER: 0,
                ADMIN: 0,
            };

            usersByRole.forEach((group: any) => {
                roleCount[group._id as UserRole] = group.count;
            });

            return {
                totalUsers,
                totalGuests,
                totalRegistered: totalUsers - totalGuests,
                usersByRole: roleCount,
            };
        } catch (error) {
            logger.error('Error getting user statistics', error);
            throw new AuthError('Failed to get statistics', 'STATS_FAILED', 500);
        }
    }
}
