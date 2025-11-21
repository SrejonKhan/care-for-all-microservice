import {
  Conversation,
  IConversation,
  ConversationStatus,
  ParticipantRole,
} from '../models/conversation.model';
import {
  CreateConversationRequest,
  UpdateConversationRequest,
  ListConversationsQuery,
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
// CONVERSATION SERVICE
// ============================================================================

export class ConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(
    userId: string,
    userRole: ParticipantRole,
    input: CreateConversationRequest
  ): Promise<IConversation> {
    try {
      logger.info('Creating conversation', { userId, input });

      const conversationId = `conv_${randomUUID()}`;

      const conversation = await Conversation.create({
        conversationId,
        participants: [
          {
            userId,
            role: userRole,
            joinedAt: new Date(),
          },
        ],
        createdBy: userId,
        status: ConversationStatus.ACTIVE,
        subject: input.subject,
        metadata: input.metadata || {},
      });

      logger.info('Conversation created successfully', {
        conversationId: conversation.conversationId,
        userId,
      });

      return conversation;
    } catch (error) {
      logger.error('Error creating conversation', {
        userId,
        input,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  static async getConversationById(
    conversationId: string
  ): Promise<IConversation | null> {
    try {
      logger.info('Getting conversation by ID', { conversationId });

      const conversation = await Conversation.findOne({ conversationId });

      if (!conversation) {
        logger.warn('Conversation not found', { conversationId });
        return null;
      }

      return conversation;
    } catch (error) {
      logger.error('Error getting conversation', {
        conversationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get conversation by ID and verify user access
   */
  static async getConversationForUser(
    conversationId: string,
    userId: string,
    userRole: string
  ): Promise<IConversation | null> {
    try {
      const conversation = await this.getConversationById(conversationId);

      if (!conversation) {
        return null;
      }

      // Admin can access any conversation
      if (userRole === 'ADMIN') {
        return conversation;
      }

    // User can only access conversations they're part of
    const isParticipant = conversation.participants.some(
      (p: { userId: string }) => p.userId === userId
    );

      if (!isParticipant) {
        logger.warn('User not authorized to access conversation', {
          conversationId,
          userId,
        });
        return null;
      }

      return conversation;
    } catch (error) {
      logger.error('Error getting conversation for user', {
        conversationId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List conversations for a user
   */
  static async listConversations(
    userId: string,
    userRole: string,
    query: ListConversationsQuery
  ): Promise<{
    conversations: IConversation[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      logger.info('Listing conversations', { userId, query });

      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};

      // Admin can see all conversations, users only see their own
      if (userRole !== 'ADMIN') {
        filter['participants.userId'] = userId;
      }

      if (query.status) {
        filter.status = query.status;
      }

      const [conversations, total] = await Promise.all([
        Conversation.find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Conversation.countDocuments(filter),
      ]);

      logger.info('Conversations listed successfully', {
        userId,
        count: conversations.length,
        total,
      });

      return {
        conversations: conversations as IConversation[],
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error listing conversations', {
        userId,
        query,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update conversation
   */
  static async updateConversation(
    conversationId: string,
    input: UpdateConversationRequest
  ): Promise<IConversation | null> {
    try {
      logger.info('Updating conversation', { conversationId, input });

      const conversation = await Conversation.findOne({ conversationId });

      if (!conversation) {
        logger.warn('Conversation not found for update', { conversationId });
        return null;
      }

      if (input.status !== undefined) {
        conversation.status = input.status;
      }

      if (input.subject !== undefined) {
        conversation.subject = input.subject;
      }

      if (input.metadata !== undefined) {
        conversation.metadata = {
          ...conversation.metadata,
          ...input.metadata,
        };
      }

      await conversation.save();

      logger.info('Conversation updated successfully', {
        conversationId: conversation.conversationId,
      });

      return conversation;
    } catch (error) {
      logger.error('Error updating conversation', {
        conversationId,
        input,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Add participant to conversation
   */
  static async addParticipant(
    conversationId: string,
    userId: string,
    role: ParticipantRole
  ): Promise<IConversation | null> {
    try {
      logger.info('Adding participant to conversation', {
        conversationId,
        userId,
        role,
      });

      const conversation = await Conversation.findOne({ conversationId });

      if (!conversation) {
        logger.warn('Conversation not found', { conversationId });
        return null;
      }

      // Check if user is already a participant
      const existingParticipant = conversation.participants.find(
        (p: { userId: string }) => p.userId === userId
      );

      if (existingParticipant) {
        logger.info('User already a participant', { conversationId, userId });
        return conversation;
      }

      // Add participant
      conversation.participants.push({
        userId,
        role,
        joinedAt: new Date(),
      });

      await conversation.save();

      logger.info('Participant added successfully', {
        conversationId,
        userId,
      });

      return conversation;
    } catch (error) {
      logger.error('Error adding participant', {
        conversationId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update last read timestamp for a participant
   */
  static async updateLastRead(
    conversationId: string,
    userId: string
  ): Promise<IConversation | null> {
    try {
      logger.info('Updating last read', { conversationId, userId });

      const conversation = await Conversation.findOne({ conversationId });

      if (!conversation) {
        logger.warn('Conversation not found', { conversationId });
        return null;
      }

      const participant = conversation.participants.find(
        (p) => p.userId === userId
      );

      if (participant) {
        participant.lastReadAt = new Date();
        await conversation.save();
      }

      return conversation;
    } catch (error) {
      logger.error('Error updating last read', {
        conversationId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

