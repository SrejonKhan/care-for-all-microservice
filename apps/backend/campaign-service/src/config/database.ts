import mongoose from 'mongoose';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'campaign-service',
  minLevel: 'info',
});

// ============================================================================
// CONNECTION
// ============================================================================

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('Database already connected');
    return;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/campaign-service';

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info('MongoDB connected successfully', { uri: mongoUri.replace(/\/\/.*@/, '//***@') });

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', error);
      isConnected = false;
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
    logger.error('Failed to connect to MongoDB', error);
    isConnected = false;
    throw error;
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!isConnected || !mongoose.connection.db) {
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
// DISCONNECT
// ============================================================================

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', error);
    throw error;
  }
}

// ============================================================================
// GETTER
// ============================================================================

export function isDatabaseConnected(): boolean {
  return isConnected;
}

