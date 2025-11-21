import * as bcrypt from 'bcrypt';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
    serviceName: 'auth-service',
    minLevel: 'info',
});

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

// ============================================================================
// PASSWORD SERVICE
// ============================================================================

export class PasswordService {
    /**
     * Hash a password using bcrypt
     * @param password Plain text password
     * @returns Hashed password
     */
    static async hash(password: string): Promise<string> {
        try {
            const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            logger.debug('Password hashed successfully');
            return hash;
        } catch (error) {
            logger.error('Error hashing password', error);
            throw new Error('Failed to hash password');
        }
    }

    /**
     * Verify a password against a hash
     * @param password Plain text password
     * @param hash Hashed password
     * @returns True if password matches, false otherwise
     */
    static async verify(password: string, hash: string): Promise<boolean> {
        try {
            const isMatch = await bcrypt.compare(password, hash);
            logger.debug('Password verification completed', { isMatch });
            return isMatch;
        } catch (error) {
            logger.error('Error verifying password', error);
            return false;
        }
    }

    /**
     * Validate password strength
     * @param password Plain text password
     * @returns Object with validation result and error message
     */
    static validatePassword(password: string): {
        valid: boolean;
        error?: string;
    } {
        if (!password) {
            return { valid: false, error: 'Password is required' };
        }

        if (password.length < 6) {
            return { valid: false, error: 'Password must be at least 6 characters long' };
        }

        if (password.length > 128) {
            return { valid: false, error: 'Password must be less than 128 characters' };
        }

        return { valid: true };
    }

    /**
     * Generate a random password (useful for temporary passwords)
     * @param length Password length (default: 12)
     * @returns Random password
     */
    static generateRandomPassword(length: number = 12): string {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        return password;
    }
}

