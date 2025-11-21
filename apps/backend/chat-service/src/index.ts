import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import { loadConfig } from '@care-for-all/shared-config';
import { createLogger } from '@care-for-all/shared-logger';
import { initTracing } from '@care-for-all/shared-otel';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig({
  serviceName: 'chat-service',
  required: {
    database: false, // TODO: Enable when DB is set up
    rabbitmq: false, // TODO: Enable when RabbitMQ is configured
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

// Store active connections by campaign room
const rooms = new Map<string, Set<any>>();

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'chat-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// WebSocket endpoint
app.get(
  '/ws/:campaignId',
  upgradeWebSocket((c) => {
    const campaignId = c.req.param('campaignId');
    
    return {
      onOpen(_event, ws) {
        logger.info('WebSocket connected', { campaignId });
        
        // Add connection to room
        if (!rooms.has(campaignId)) {
          rooms.set(campaignId, new Set());
        }
        rooms.get(campaignId)?.add(ws);
        
        // Send welcome message
        ws.send(JSON.stringify({
          type: 'system',
          message: 'Connected to chat',
          timestamp: new Date().toISOString(),
        }));
      },
      
      onMessage(event, ws) {
        const data = JSON.parse(event.data.toString());
        
        logger.info('Message received', { campaignId, data });
        
        // TODO: Store message in database
        // TODO: Publish ChatMessageEvent to RabbitMQ
        
        // Broadcast to all clients in the room
        const message = {
          type: 'message',
          id: 'msg_' + Date.now(),
          campaignId,
          userId: data.userId || 'anonymous',
          userName: data.userName || 'Anonymous',
          message: data.message,
          timestamp: new Date().toISOString(),
        };
        
        const room = rooms.get(campaignId);
        if (room) {
          const messageStr = JSON.stringify(message);
          room.forEach((client) => {
            try {
              client.send(messageStr);
            } catch (error) {
              logger.error('Error sending message to client', error);
            }
          });
        }
      },
      
      onClose(_event, ws) {
        logger.info('WebSocket disconnected', { campaignId });
        
        // Remove connection from room
        const room = rooms.get(campaignId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            rooms.delete(campaignId);
          }
        }
      },
      
      onError(event) {
        logger.error('WebSocket error', event);
      },
    };
  })
);

// REST API for message history
app.get('/messages/:campaignId', (c) => {
  const campaignId = c.req.param('campaignId');
  
  logger.info('Fetching message history', { campaignId });
  
  // TODO: Query messages from database
  
  return c.json({
    success: true,
    data: {
      campaignId,
      messages: [],
    },
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'chat-service',
    version: '1.0.0',
    endpoints: {
      websocket: '/ws/:campaignId',
      history: '/messages/:campaignId',
      health: '/health',
    },
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const port = config.PORT;

logger.info(`Starting chat-service on port ${port} with WebSocket support`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};

