import mongoose from 'mongoose';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

const logger = createLogger({
    serviceName: 'auth-service',
    minLevel: 'info',
});

// Connection options
const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

let isConnected = false;

/**
 * Connect to MongoDB
 */
export async function connectDatabase(): Promise<void> {
    if (isConnected) {
        logger.debug('Using existing MongoDB connection');
        return;
    }

    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;

    if (!mongoUri) {
        throw new Error('MONGODB_URI or DATABASE_URL environment variable is required');
    }

    try {
        // Set up mongoose event listeners
        mongoose.connection.on('connected', () => {
            logger.info('MongoDB connected successfully');
            isConnected = true;
        });

        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
            isConnected = false;
        });

        // Enable debug mode in development
        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', (collectionName: string, method: string, query: any, doc: any) => {
                logger.debug('MongoDB query', {
                    collection: collectionName,
                    method,
                    query: JSON.stringify(query),
                    duration: doc?.duration || 'N/A',
                });
            });
        }

        // Connect to MongoDB
        await mongoose.connect(mongoUri, options);

        logger.info('MongoDB connection established', {
            host: mongoose.connection.host,
            database: mongoose.connection.name,
        });
    } catch (error) {
        logger.error('Failed to connect to MongoDB', error);
        throw error;
    }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if database connection is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
    try {
        if (!isConnected || mongoose.connection.readyState !== 1) {
            return false;
        }

        // Ping the database
        await mongoose.connection.db.admin().ping();
        return true;
    } catch (error) {
        logger.error('Database health check failed', error);
        return false;
    }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Disconnect from database gracefully
 */
export async function disconnectDatabase(): Promise<void> {
    try {
        if (isConnected) {
            await mongoose.connection.close();
            isConnected = false;
            logger.info('MongoDB disconnected successfully');
        }
    } catch (error) {
        logger.error('Error disconnecting from MongoDB', error);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
});

// ============================================================================
// EXPORTS
// ============================================================================

export { mongoose };
export default mongoose;
