import { Message, IMessage, MessageType, ParticipantRole } from '../models/message.model';
import {
  SendMessageRequest,
  ListMessagesQuery,
} from '../types/chat.types';
import { createLogger } from '@care-for-all/shared-logger';
import { randomUUID } from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'chat-service',
  minLevel: 'info',
});

// ============================================================================
// MESSAGE SERVICE
// ============================================================================

export class MessageService {
  /**
   * Create a new message
   */
  static async createMessage(
    conversationId: string,
    senderId: string,
    senderRole: ParticipantRole,
    input: SendMessageRequest
  ): Promise<IMessage> {
    try {
      logger.info('Creating message', {
        conversationId,
        senderId,
        input,
      });

      const messageId = `msg_${randomUUID()}`;

      const message = await Message.create({
        messageId,
        conversationId,
        senderId,
        senderRole,
        content: input.content,
        messageType: input.messageType || MessageType.TEXT,
        readBy: [],
        metadata: input.metadata || {},
      });

      logger.info('Message created successfully', {
        messageId: message.messageId,
        conversationId,
        senderId,
      });

      return message;
    } catch (error) {
      logger.error('Error creating message', {
        conversationId,
        senderId,
        input,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  static async getMessageById(messageId: string): Promise<IMessage | null> {
    try {
      logger.info('Getting message by ID', { messageId });

      const message = await Message.findOne({ messageId });

      if (!message) {
        logger.warn('Message not found', { messageId });
        return null;
      }

      return message;
    } catch (error) {
      logger.error('Error getting message', {
        messageId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List messages for a conversation
   */
  static async listMessages(
    conversationId: string,
    query: ListMessagesQuery
  ): Promise<{
    messages: IMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      logger.info('Listing messages', { conversationId, query });

      const page = query.page || 1;
      const limit = query.limit || 50;
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = { conversationId };

      // Cursor-based pagination
      if (query.before) {
        const beforeMessage = await Message.findOne({ messageId: query.before });
        if (beforeMessage) {
          filter.createdAt = { $lt: beforeMessage.createdAt };
        }
      } else if (query.after) {
        const afterMessage = await Message.findOne({ messageId: query.after });
        if (afterMessage) {
          filter.createdAt = { $gt: afterMessage.createdAt };
        }
      }

      const [messages, total] = await Promise.all([
        Message.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Message.countDocuments(filter),
      ]);

      // Reverse to get chronological order
      messages.reverse();

      logger.info('Messages listed successfully', {
        conversationId,
        count: messages.length,
        total,
      });

      return {
        messages: messages as IMessage[],
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error listing messages', {
        conversationId,
        query,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(
    messageId: string,
    userId: string
  ): Promise<IMessage | null> {
    try {
      logger.info('Marking message as read', { messageId, userId });

      const message = await Message.findOne({ messageId });

      if (!message) {
        logger.warn('Message not found', { messageId });
        return null;
      }

      // Check if already read by this user
      const alreadyRead = message.readBy.some((r) => r.userId === userId);

      if (!alreadyRead) {
        message.readBy.push({
          userId,
          readAt: new Date(),
        });
        await message.save();
      }

      return message;
    } catch (error) {
      logger.error('Error marking message as read', {
        messageId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mark all messages in conversation as read
   */
  static async markAllAsRead(
    conversationId: string,
    userId: string
  ): Promise<number> {
    try {
      logger.info('Marking all messages as read', { conversationId, userId });

      const result = await Message.updateMany(
        {
          conversationId,
          'readBy.userId': { $ne: userId },
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date(),
            },
          },
        }
      );

      logger.info('All messages marked as read', {
        conversationId,
        userId,
        count: result.modifiedCount,
      });

      return result.modifiedCount || 0;
    } catch (error) {
      logger.error('Error marking all messages as read', {
        conversationId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get unread message count for a user in a conversation
   */
  static async getUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<number> {
    try {
      const count = await Message.countDocuments({
        conversationId,
        senderId: { $ne: userId }, // Don't count own messages
        'readBy.userId': { $ne: userId },
      });

      return count;
    } catch (error) {
      logger.error('Error getting unread count', {
        conversationId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

