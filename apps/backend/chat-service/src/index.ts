import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';
import { connectDatabase, disconnectDatabase } from './config/database';
import { createWebSocketHandler } from './handlers/websocket.handler';
import conversationsRouter from './routes/conversations';
import healthRouter from './routes/health';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'chat-service',
  required: {
    database: true,
    rabbitmq: false,
    otel: false,
  },
});

const logger = createLogger({
  serviceName: 'chat-service',
  minLevel: config.LOG_LEVEL,
  prettyPrint: config.NODE_ENV === 'development',
});

// Initialize OpenTelemetry
if (config.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initTracing({
    serviceName: 'chat-service',
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    enabled: config.OTEL_TRACES_ENABLED,
  });
}

// ============================================================================
// WEBSOCKET SETUP
// ============================================================================

const { upgradeWebSocket, websocket } = createBunWebSocket();

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = new Hono();

// CORS middleware
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  if (origin) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    );
    c.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
  }

  if (c.req.method === 'OPTIONS') {
    return new Response('', { status: 204 });
  }

  await next();
});

// Health check
app.route('/health', healthRouter);

// REST API routes
app.route('/api/conversations', conversationsRouter);

// WebSocket endpoint for conversations
app.get(
  '/ws/conversations/:conversationId',
  upgradeWebSocket((c) => {
    const conversationId = c.req.param('conversationId');
    const token = c.req.query('token') || '';
    return createWebSocketHandler(conversationId, token);
  })
);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'chat-service',
    version: '1.0.0',
    endpoints: {
      websocket: '/ws/conversations/:conversationId?token={jwt}',
      conversations: '/api/conversations',
      health: '/health',
    },
  });
});

// ============================================================================
// INITIALIZATION
// ============================================================================

async function start() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start server
    const port = config.PORT;
    logger.info(`Starting chat-service on port ${port} with WebSocket support`);

    return {
      port,
      fetch: app.fetch,
      websocket,
    };
  } catch (error) {
    logger.error('Failed to start chat-service', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

// ============================================================================
// START SERVER
// ============================================================================

// Use top-level await (supported in Bun with esnext module)
export default await start();
