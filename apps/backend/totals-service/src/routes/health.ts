import { createRoute, z } from '@hono/zod-openapi';

// ============================================================================
// HEALTH CHECK ROUTE
// ============================================================================

export const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string(),
            service: z.string(),
            version: z.string(),
            timestamp: z.string(),
            uptime: z.number(),
          }),
        },
      },
    },
  },
});
