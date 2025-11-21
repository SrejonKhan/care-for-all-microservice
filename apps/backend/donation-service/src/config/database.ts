import mongoose from 'mongoose';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'donation-service',
  required: {
    database: true,
    rabbitmq: false,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'donation-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

let isConnected = false;

/**
 * Connect to MongoDB with replica set support
 * Donation Service requires replica set for transactions (Outbox pattern)
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('Database already connected');
    return;
  }

  try {
    const dbUrl = config.DATABASE_URL;

    if (!dbUrl) {
      throw new Error('DATABASE_URL is required');
    }

    logger.info('Connecting to MongoDB...', {
      url: dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'), // Mask credentials
    });

    // Connect with replica set support
    await mongoose.connect(dbUrl, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Replica set specific options
      readPreference: 'primary',
      w: 'majority',
      retryWrites: true,
    });

    isConnected = true;

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      dbName: mongoose.connection.name,
    });

    // Handle connection events
    mongoose.connection.on('error', (error: Error) => {
      logger.error('MongoDB connection error', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: (error as Error).message,
    });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', error);
    throw error;
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  message: string;
  details?: any;
}> {
  try {
    if (!isConnected || mongoose.connection.readyState !== 1) {
      return {
        healthy: false,
        message: 'Database not connected',
        details: {
          readyState: mongoose.connection.readyState,
        },
      };
    }

    // Ping the database
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }

    return {
      healthy: true,
      message: 'Database is healthy',
      details: {
        host: mongoose.connection.host,
        dbName: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      message: (error as Error).message,
    };
  }
}

/**
 * Get database connection status
 */
export function getDatabaseStatus(): {
  isConnected: boolean;
  readyState: number;
  host?: string;
  dbName?: string;
} {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    dbName: mongoose.connection.name,
  };
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connection');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connection');
  await disconnectDatabase();
  process.exit(0);
});

