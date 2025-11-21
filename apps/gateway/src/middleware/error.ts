import { ErrorHandler } from 'hono';
import { Logger } from '@care-for-all/shared-logger';

/**
 * Global error handler
 */
export function errorHandler(logger: Logger): ErrorHandler {
  return (err, c) => {
    logger.error('Unhandled error', err, {
      path: c.req.path,
      method: c.req.method,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  };
}

