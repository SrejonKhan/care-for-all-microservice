import { ServerWebSocket } from 'bun';
import { verifyToken } from '../middleware/auth';
import { ConversationService } from '../services/conversation.service';
import { MessageService } from '../services/message.service';
import { WebSocketManagerService } from '../services/websocket-manager.service';
import {
  ClientWebSocketMessage,
  ServerWebSocketMessage,
  WebSocketMessageType,
  WebSocketConnectionInfo,
} from '../types/websocket.types';
import { ParticipantRole, ConversationStatus } from '../models/conversation.model';
import { MessageType } from '../models/message.model';
import { createLogger } from '@care-for-all/shared-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'chat-service',
  minLevel: 'info',
});

// ============================================================================
// WEBSOCKET HANDLER
// ============================================================================

export interface WebSocketData {
  conversationId: string;
  userId: string;
  role: string;
}

/**
 * Handle WebSocket connection
 */
export function createWebSocketHandler(conversationId: string, token?: string) {
  return {
    async onOpen(ws: any) {
      try {
        if (!token) {
          logger.warn('WebSocket connection without token', { conversationId });
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.ERROR,
              code: 'MISSING_TOKEN',
              message: 'Token is required',
            } as ServerWebSocketMessage)
          );
          ws.close();
          return;
        }

        // Verify token
        let payload;
        try {
          payload = verifyToken(token);
        } catch (error) {
          logger.warn('Invalid token in WebSocket connection', {
            conversationId,
            error: (error as Error).message,
          });
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.ERROR,
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired token',
            } as ServerWebSocketMessage)
          );
          ws.close();
          return;
        }

        const { userId, role } = payload;

        // Verify user has access to conversation
        const conversation = await ConversationService.getConversationForUser(
          conversationId,
          userId,
          role
        );

        if (!conversation) {
          logger.warn('User not authorized to access conversation', {
            conversationId,
            userId,
          });
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.ERROR,
              code: 'UNAUTHORIZED',
              message: 'You do not have access to this conversation',
            } as ServerWebSocketMessage)
          );
          ws.close();
          return;
        }

        // Add user to conversation if not already a participant (for admins)
        if (role === 'ADMIN' && !conversation.participants.some((p) => p.userId === userId)) {
          await ConversationService.addParticipant(
            conversationId,
            userId,
            ParticipantRole.ADMIN
          );
        }

        // Store connection info
        ws.data = {
          conversationId,
          userId,
          role,
        };

        // Add connection to manager
        const connectionInfo: WebSocketConnectionInfo = {
          userId,
          role: role as ParticipantRole,
          conversationId,
          connectedAt: new Date(),
        };
        WebSocketManagerService.addConnection(ws, connectionInfo);

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: WebSocketMessageType.SYSTEM,
            message: 'Connected to conversation',
            timestamp: new Date().toISOString(),
          } as ServerWebSocketMessage)
        );

        // Notify other participants
        WebSocketManagerService.broadcastToConversation(
          conversationId,
          {
            type: WebSocketMessageType.USER_JOINED,
            userId,
            role: role as ParticipantRole,
          },
          ws
        );

        logger.info('WebSocket connection opened', {
          conversationId,
          userId,
          role,
        });
      } catch (error) {
        logger.error('Error in WebSocket onOpen', {
          conversationId,
          error: (error as Error).message,
        });
        ws.close();
      }
    },

    async onMessage(evt: any, ws: any) {
      try {
        const { conversationId, userId, role } = ws.data;

        if (!conversationId || !userId) {
          logger.warn('WebSocket message from unauthenticated connection');
          return;
        }

        // Parse message
        let clientMessage: ClientWebSocketMessage;
        try {
          const message = typeof evt === 'string' ? evt : (evt.data?.toString() || JSON.stringify(evt));
          const messageStr = typeof message === 'string' ? message : message.toString();
          clientMessage = JSON.parse(messageStr);
        } catch (error) {
          logger.warn('Invalid JSON in WebSocket message', {
            conversationId,
            userId,
          });
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.ERROR,
              code: 'INVALID_MESSAGE',
              message: 'Invalid message format',
            } as ServerWebSocketMessage)
          );
          return;
        }

        // Handle different message types
        switch (clientMessage.type) {
          case WebSocketMessageType.MESSAGE:
            await handleMessage(ws, clientMessage, conversationId, userId, role);
            break;

          case WebSocketMessageType.TYPING:
            handleTyping(ws, clientMessage, conversationId, userId);
            break;

          case WebSocketMessageType.READ:
            await handleRead(ws, clientMessage, conversationId, userId);
            break;

          case WebSocketMessageType.PING:
            ws.send(
              JSON.stringify({
                type: WebSocketMessageType.PONG,
                timestamp: new Date().toISOString(),
              } as ServerWebSocketMessage)
            );
            break;

          default:
            logger.warn('Unknown message type', {
              conversationId,
              userId,
              type: (clientMessage as any).type,
            });
        }
      } catch (error) {
        logger.error('Error in WebSocket onMessage', {
          error: (error as Error).message,
        });
        ws.send(
          JSON.stringify({
            type: WebSocketMessageType.ERROR,
            code: 'INTERNAL_ERROR',
            message: 'An error occurred processing your message',
          } as ServerWebSocketMessage)
        );
      }
    },

    onClose(ws: any) {
      try {
        const { conversationId, userId } = ws.data || {};

        if (conversationId && userId) {
          // Notify other participants
          WebSocketManagerService.broadcastToConversation(
            conversationId,
            {
              type: WebSocketMessageType.USER_LEFT,
              userId,
            },
            ws
          );
        }

        // Remove connection
        WebSocketManagerService.removeConnection(ws);

        logger.info('WebSocket connection closed', {
          conversationId,
          userId,
        });
      } catch (error) {
        logger.error('Error in WebSocket onClose', {
          error: (error as Error).message,
        });
      }
    },

    onError(event: any, ws: any) {
      logger.error('WebSocket error', {
        conversationId: ws.data?.conversationId,
        userId: ws.data?.userId,
      });
    },
  };
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

async function handleMessage(
  ws: ServerWebSocket<WebSocketData>,
  clientMessage: any,
  conversationId: string,
  userId: string,
  role: string
) {
  const { content, messageType, metadata } = clientMessage;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    ws.send(
      JSON.stringify({
        type: WebSocketMessageType.ERROR,
        code: 'INVALID_MESSAGE',
        message: 'Message content is required',
      } as ServerWebSocketMessage)
    );
    return;
  }

  // Create message in database
  const message = await MessageService.createMessage(
    conversationId,
    userId,
    role as ParticipantRole,
    {
      content: content.trim(),
      messageType: messageType || MessageType.TEXT,
      metadata,
    }
  );

  // Send confirmation to sender
  ws.send(
    JSON.stringify({
      type: WebSocketMessageType.MESSAGE_SENT,
      messageId: message.messageId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt.toISOString(),
    } as ServerWebSocketMessage)
  );

  // Broadcast to other participants
  WebSocketManagerService.broadcastToConversation(
    conversationId,
    {
      type: WebSocketMessageType.MESSAGE_RECEIVED,
      messageId: message.messageId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt.toISOString(),
    },
    ws
  );

  logger.info('Message sent via WebSocket', {
    conversationId,
    messageId: message.messageId,
    senderId: userId,
  });
}

function handleTyping(
  ws: ServerWebSocket<WebSocketData>,
  clientMessage: any,
  conversationId: string,
  userId: string
) {
  const { isTyping } = clientMessage;

  if (isTyping) {
    WebSocketManagerService.broadcastToConversation(
      conversationId,
      {
        type: WebSocketMessageType.TYPING_START,
        userId,
      },
      ws
    );
  } else {
    WebSocketManagerService.broadcastToConversation(
      conversationId,
      {
        type: WebSocketMessageType.TYPING_STOP,
        userId,
      },
      ws
    );
  }
}

async function handleRead(
  ws: ServerWebSocket<WebSocketData>,
  clientMessage: any,
  conversationId: string,
  userId: string
) {
  const { messageId } = clientMessage;

  if (messageId) {
    // Mark specific message as read
    const message = await MessageService.markAsRead(messageId, userId);
    if (message) {
      WebSocketManagerService.broadcastToConversation(
        conversationId,
        {
          type: WebSocketMessageType.READ_RECEIPT,
          messageId: message.messageId,
          userId,
          readAt: new Date().toISOString(),
        },
        ws
      );
    }
  } else {
    // Mark all messages in conversation as read
    await MessageService.markAllAsRead(conversationId, userId);
    await ConversationService.updateLastRead(conversationId, userId);
  }
}

