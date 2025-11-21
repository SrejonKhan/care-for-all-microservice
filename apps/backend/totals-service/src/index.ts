import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { connectDatabase, checkDatabaseHealth } from './config/database';
import { healthRoute } from './routes/health';
import { getCampaignTotalsRoute, listCampaignTotalsRoute } from './routes/totals';
import { TotalsService } from './services/totals.service';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'totals-service',
  required: {
    database: true,
    rabbitmq: false,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'totals-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'totals-service',
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    enabled: config.OTEL_TRACES_ENABLED,
  });
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = new OpenAPIHono();

// Health check
app.openapi(healthRoute, async (c) => {
  const dbHealth = await checkDatabaseHealth();

  return c.json({
    status: dbHealth.healthy ? 'healthy' : 'degraded',
    service: 'totals-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
  });
});

// Get campaign totals (fast read - no recalculation)
app.openapi(getCampaignTotalsRoute, async (c) => {
  try {
    const { campaignId } = c.req.valid('param');

    logger.info('Getting campaign totals', { campaignId });

    const totals = await TotalsService.getCampaignTotals(campaignId);

    if (!totals) {
      return c.json(
        {
          success: false,
          error: {
            code: 'TOTALS_NOT_FOUND',
            message: `Campaign totals not found for campaign: ${campaignId}`,
          },
        },
        404 as any
      );
    }

    return c.json({
      success: true,
      data: {
        campaignId: totals.campaignId,
        totalAmount: totals.totalAmount,
        totalPledges: totals.totalPledges,
        totalDonors: totals.totalDonors,
        lastUpdated: totals.lastUpdated.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error getting campaign totals', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'TOTALS_RETRIEVAL_ERROR',
          message: (error as Error).message,
        },
      },
      500 as any
    );
  }
});

// List all campaign totals
app.openapi(listCampaignTotalsRoute, async (c) => {
  try {
    const query = c.req.valid('query');

    logger.info('Listing campaign totals', { query });

    const { totals, total } = await TotalsService.listCampaignTotals({
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return c.json({
      success: true,
      data: {
        totals: totals.map((t) => ({
          campaignId: t.campaignId,
          totalAmount: t.totalAmount,
          totalPledges: t.totalPledges,
          totalDonors: t.totalDonors,
          lastUpdated: t.lastUpdated.toISOString(),
        })),
        total,
        limit: query.limit || 20,
        offset: query.offset || 0,
      },
    });
  } catch (error) {
    logger.error('Error listing campaign totals', {
      error: (error as Error).message,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'TOTALS_LIST_ERROR',
          message: (error as Error).message,
        },
      },
      500 as any
    );
  }
});

// API Documentation
app.get(
  '/docs',
  apiReference({
    theme: 'purple',
    spec: {
      url: '/openapi',
    },
  })
);

// OpenAPI spec
app.doc('/openapi', {
  openapi: '3.1.0',
  info: {
    title: 'Totals Service API',
    version: '1.0.0',
    description: 'Materialized read model for campaign totals - fast reads without recalculation',
  },
  servers: [
    {
      url: 'http://localhost:3005',
      description: 'Development server',
    },
  ],
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.onError((err, c) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500 as any
  );
});

// ============================================================================
// STARTUP
// ============================================================================

async function startServer() {
  try {
    logger.info('Starting totals-service...');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    const port = config.PORT;
    logger.info(`Totals-service running on port ${port}`);
    logger.info(`API Documentation: http://localhost:${port}/docs`);
  } catch (error) {
    logger.error('Failed to start server', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// Start server
startServer();

// ============================================================================
// EXPORT
// ============================================================================

export default {
  port: config.PORT,
  fetch: app.fetch,
};

