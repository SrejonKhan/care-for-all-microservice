import { MiddlewareHandler } from 'hono';
import { Logger, createRequestContext } from '@care-for-all/shared-logger';

/**
 * Logging middleware for HTTP requests
 */
export function loggingMiddleware(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const requestContext = createRequestContext({
      method: c.req.method,
      url: c.req.url,
      headers: c.req.header() as Record<string, string>,
    });

    const requestLogger = logger.child(requestContext);

    requestLogger.info(`Incoming request: ${c.req.method} ${c.req.path}`);

    await next();

    const duration = Date.now() - start;
    requestLogger.info(`Request completed: ${c.req.method} ${c.req.path}`, {
      status: c.res.status,
      duration,
    });
  };
}

