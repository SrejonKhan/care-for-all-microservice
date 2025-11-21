import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { checkDatabaseHealth } from '../config/database';

const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
  database: z.string(),
});

export const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Health check endpoint',
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: HealthCheckResponseSchema,
        },
      },
    },
  },
});

export const healthRouter = new OpenAPIHono();

healthRouter.openapi(healthRoute, async (c) => {
  const dbHealth = await checkDatabaseHealth();

  return c.json({
    status: dbHealth.healthy ? 'healthy' : 'degraded',
    service: 'donation-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth.healthy ? 'connected' : 'disconnected',
  });
});

