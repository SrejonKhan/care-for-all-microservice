import { Hono } from 'hono';
import { checkDatabaseHealth } from '../config/database';

// ============================================================================
// ROUTES
// ============================================================================

const router = new Hono();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (c) => {
  const dbHealth = await checkDatabaseHealth();

  const status = dbHealth.healthy ? 200 : 503;

  return c.json(
    {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      service: 'chat-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        healthy: dbHealth.healthy,
        message: dbHealth.message,
        details: dbHealth.details,
      },
    },
    status
  );
});

export default router;

