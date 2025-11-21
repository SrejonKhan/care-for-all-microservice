import { ServerWebSocket } from 'bun';
import { WebSocketConnectionInfo, ServerWebSocketMessage } from '../types/websocket.types';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'chat-service',
  minLevel: 'info',
});

// ============================================================================
// WEBSOCKET MANAGER SERVICE
// ============================================================================

/**
 * Manages WebSocket connections for chat service
 * - Stores connections by conversation ID
 * - Stores user info per connection
 * - Handles broadcasting messages
 */
export class WebSocketManagerService {
  // Map of conversationId -> Set of WebSocket connections
  private static connections = new Map<string, Set<ServerWebSocket<any>>>();

  // Map of WebSocket -> Connection info
  private static connectionInfo = new Map<
    ServerWebSocket<any>,
    WebSocketConnectionInfo
  >();

  /**
   * Add a connection to a conversation
   */
  static addConnection(
    ws: ServerWebSocket<any>,
    info: WebSocketConnectionInfo
  ): void {
    const { conversationId } = info;

    // Initialize conversation set if needed
    if (!this.connections.has(conversationId)) {
      this.connections.set(conversationId, new Set());
    }

    // Add connection
    this.connections.get(conversationId)!.add(ws);
    this.connectionInfo.set(ws, info);

    logger.info('WebSocket connection added', {
      conversationId,
      userId: info.userId,
      role: info.role,
      totalConnections: this.connections.get(conversationId)!.size,
    });
  }

  /**
   * Remove a connection
   */
  static removeConnection(ws: ServerWebSocket<any>): void {
    const info = this.connectionInfo.get(ws);

    if (!info) {
      logger.warn('Connection info not found for WebSocket');
      return;
    }

    const { conversationId } = info;

    // Remove from conversation set
    const conversationConnections = this.connections.get(conversationId);
    if (conversationConnections) {
      conversationConnections.delete(ws);

      // Clean up empty conversation sets
      if (conversationConnections.size === 0) {
        this.connections.delete(conversationId);
      }
    }

    // Remove connection info
    this.connectionInfo.delete(ws);

    logger.info('WebSocket connection removed', {
      conversationId,
      userId: info.userId,
      remainingConnections: conversationConnections?.size || 0,
    });
  }

  /**
   * Get connection info for a WebSocket
   */
  static getConnectionInfo(
    ws: ServerWebSocket<any>
  ): WebSocketConnectionInfo | null {
    return this.connectionInfo.get(ws) || null;
  }

  /**
   * Broadcast message to all connections in a conversation
   */
  static broadcastToConversation(
    conversationId: string,
    message: ServerWebSocketMessage,
    excludeSender?: ServerWebSocket<any>
  ): number {
    const connections = this.connections.get(conversationId);

    if (!connections || connections.size === 0) {
      logger.debug('No connections found for conversation', { conversationId });
      return 0;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    connections.forEach((ws) => {
      // Skip sender if specified
      if (excludeSender && ws === excludeSender) {
        return;
      }

      try {
        if (ws.readyState === 1) {
          // 1 = OPEN
          ws.send(messageStr);
          sentCount++;
        } else {
          // Connection is closed, remove it
          logger.debug('Removing closed connection', {
            conversationId,
            readyState: ws.readyState,
          });
          this.removeConnection(ws);
        }
      } catch (error) {
        logger.error('Error sending message to WebSocket', {
          conversationId,
          error: (error as Error).message,
        });
        // Remove failed connection
        this.removeConnection(ws);
      }
    });

    logger.debug('Message broadcasted', {
      conversationId,
      sentCount,
      totalConnections: connections.size,
    });

    return sentCount;
  }

  /**
   * Send message to a specific connection
   */
  static sendToConnection(
    ws: ServerWebSocket<any>,
    message: ServerWebSocketMessage
  ): boolean {
    try {
      if (ws.readyState === 1) {
        // 1 = OPEN
        ws.send(JSON.stringify(message));
        return true;
      } else {
        logger.debug('WebSocket not open', { readyState: ws.readyState });
        this.removeConnection(ws);
        return false;
      }
    } catch (error) {
      logger.error('Error sending message to WebSocket', {
        error: (error as Error).message,
      });
      this.removeConnection(ws);
      return false;
    }
  }

  /**
   * Get all connections for a conversation
   */
  static getConversationConnections(
    conversationId: string
  ): Set<ServerWebSocket<any>> {
    return this.connections.get(conversationId) || new Set();
  }

  /**
   * Get connection count for a conversation
   */
  static getConnectionCount(conversationId: string): number {
    return this.connections.get(conversationId)?.size || 0;
  }

  /**
   * Get all active conversations
   */
  static getActiveConversations(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get all connections for a user (across all conversations)
   */
  static getUserConnections(userId: string): ServerWebSocket<any>[] {
    const userConnections: ServerWebSocket<any>[] = [];

    this.connectionInfo.forEach((info, ws) => {
      if (info.userId === userId) {
        userConnections.push(ws);
      }
    });

    return userConnections;
  }
}

