import { MiddlewareHandler } from 'hono';
import { Logger } from '@care-for-all/shared-logger';

/**
 * Proxy middleware to forward requests to microservices
 */
export function proxyMiddleware(
  targetUrl: string,
  prefix: string,
  logger: Logger
): MiddlewareHandler {
  return async (c) => {
    const path = c.req.path.replace(prefix, '');
    const url = `${targetUrl}${path}${c.req.url.includes('?') ? '?' + c.req.url.split('?')[1] : ''}`;

    logger.debug(`Proxying request to ${url}`, {
      method: c.req.method,
      path: c.req.path,
    });

    try {
      // Forward the request
      const response = await fetch(url, {
        method: c.req.method,
        headers: c.req.header() as Record<string, string>,
        body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.raw.clone().text(),
      });

      // Forward the response
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      logger.error(`Proxy error for ${url}`, error);
      return c.json(
        {
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: 'Failed to reach downstream service',
          },
        },
        503
      );
    }
  };
}

