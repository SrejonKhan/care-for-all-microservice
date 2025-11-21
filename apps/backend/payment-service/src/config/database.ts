import mongoose from 'mongoose';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'payment-service',
  required: {
    database: true,
    rabbitmq: false,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'payment-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

let isConnected = false;

/**
 * Connect to MongoDB with replica set support
 * Payment Service requires replica set for transactions
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
    mongoose.connection.on('error', (error) => {
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

/**
 * Disconnect from MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', {
      error: (error as Error).message,
    });
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
    await mongoose.connection.db.admin().ping();

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

