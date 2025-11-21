import { Hono } from 'hono';
import { ConversationService } from '../services/conversation.service';
import { MessageService } from '../services/message.service';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { ParticipantRole, ConversationStatus } from '../models/conversation.model';
import { createLogger } from '@care-for-all/shared-logger';

// Extend Hono context to include user
type Env = {
  Variables: {
    user: { userId: string; role: string };
  };
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const logger = createLogger({
  serviceName: 'chat-service',
  minLevel: 'info',
});

// ============================================================================
// ROUTES
// ============================================================================

const router = new Hono<Env>();

/**
 * List conversations for the authenticated user
 * GET /api/conversations
 */
router.get('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { page, limit, status } = c.req.query();

    const result = await ConversationService.listConversations(
      user.userId,
      user.role,
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        status: status as ConversationStatus | undefined,
      }
    );

    return c.json({
      success: true,
      data: {
        conversations: result.conversations.map((conv) => ({
          conversationId: conv.conversationId,
          participants: conv.participants.map((p) => ({
            userId: p.userId,
            role: p.role,
            joinedAt: p.joinedAt.toISOString(),
            lastReadAt: p.lastReadAt?.toISOString(),
          })),
          createdBy: conv.createdBy,
          status: conv.status,
          subject: conv.subject,
          metadata: conv.metadata,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
        })),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      },
    });
  } catch (error) {
    logger.error('Error listing conversations', {
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list conversations',
        },
      },
      500
    );
  }
});

/**
 * Create a new conversation
 * POST /api/conversations
 */
router.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const conversation = await ConversationService.createConversation(
      user.userId,
      user.role as ParticipantRole,
      {
        subject: body.subject,
        metadata: body.metadata,
      }
    );

    return c.json(
      {
        success: true,
        data: {
          conversationId: conversation.conversationId,
          participants: conversation.participants.map((p) => ({
            userId: p.userId,
            role: p.role,
            joinedAt: p.joinedAt.toISOString(),
            lastReadAt: p.lastReadAt?.toISOString(),
          })),
          createdBy: conversation.createdBy,
          status: conversation.status,
          subject: conversation.subject,
          metadata: conversation.metadata,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
        },
      },
      201
    );
  } catch (error) {
    logger.error('Error creating conversation', {
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create conversation',
        },
      },
      500
    );
  }
});

/**
 * Get conversation by ID
 * GET /api/conversations/:id
 */
router.get('/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    const conversation = await ConversationService.getConversationForUser(
      conversationId,
      user.userId,
      user.role
    );

    if (!conversation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        conversationId: conversation.conversationId,
        participants: conversation.participants.map((p) => ({
          userId: p.userId,
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
          lastReadAt: p.lastReadAt?.toISOString(),
        })),
        createdBy: conversation.createdBy,
        status: conversation.status,
        subject: conversation.subject,
        metadata: conversation.metadata,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error getting conversation', {
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get conversation',
        },
      },
      500
    );
  }
});

/**
 * Update conversation
 * PUT /api/conversations/:id
 */
router.put('/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');
    const body = await c.req.json();

    // Verify user has access
    const conversation = await ConversationService.getConversationForUser(
      conversationId,
      user.userId,
      user.role
    );

    if (!conversation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        },
        404
      );
    }

    const updated = await ConversationService.updateConversation(
      conversationId,
      {
        status: body.status,
        subject: body.subject,
        metadata: body.metadata,
      }
    );

    return c.json({
      success: true,
      data: {
        conversationId: updated!.conversationId,
        participants: updated!.participants.map((p) => ({
          userId: p.userId,
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
          lastReadAt: p.lastReadAt?.toISOString(),
        })),
        createdBy: updated!.createdBy,
        status: updated!.status,
        subject: updated!.subject,
        metadata: updated!.metadata,
        createdAt: updated!.createdAt.toISOString(),
        updatedAt: updated!.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error updating conversation', {
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update conversation',
        },
      },
      500
    );
  }
});

/**
 * Assign admin to conversation
 * POST /api/conversations/:id/assign
 */
router.post('/:id/assign', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');
    const body = await c.req.json();

    // Only admins can assign other admins
    if (user.role !== 'ADMIN') {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only admins can assign admins to conversations',
          },
        },
        403
      );
    }

    const conversation = await ConversationService.addParticipant(
      conversationId,
      body.adminId || user.userId,
      ParticipantRole.ADMIN
    );

    if (!conversation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        conversationId: conversation.conversationId,
        participants: conversation.participants.map((p) => ({
          userId: p.userId,
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
          lastReadAt: p.lastReadAt?.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error('Error assigning admin', {
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to assign admin',
        },
      },
      500
    );
  }
});

/**
 * Mark conversation as read
 * PUT /api/conversations/:id/read
 */
router.put('/:id/read', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    // Verify user has access
    const conversation = await ConversationService.getConversationForUser(
      conversationId,
      user.userId,
      user.role
    );

    if (!conversation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        },
        404
      );
    }

    // Mark all messages as read
    await MessageService.markAllAsRead(conversationId, user.userId);
    await ConversationService.updateLastRead(conversationId, user.userId);

    return c.json({
      success: true,
      data: {
        message: 'Conversation marked as read',
      },
    });
  } catch (error) {
    logger.error('Error marking conversation as read', {
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to mark conversation as read',
        },
      },
      500
    );
  }
});

/**
 * Get messages for a conversation
 * GET /api/conversations/:id/messages
 */
router.get('/:id/messages', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');
    const { page, limit, before, after } = c.req.query();

    // Verify user has access
    const conversation = await ConversationService.getConversationForUser(
      conversationId,
      user.userId,
      user.role
    );

    if (!conversation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        },
        404
      );
    }

    const result = await MessageService.listMessages(conversationId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      before,
      after,
    });

    return c.json({
      success: true,
      data: {
        messages: result.messages.map((msg) => ({
          messageId: msg.messageId,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          senderRole: msg.senderRole,
          content: msg.content,
          messageType: msg.messageType,
          readBy: msg.readBy.map((r) => ({
            userId: r.userId,
            readAt: r.readAt.toISOString(),
          })),
          metadata: msg.metadata,
          createdAt: msg.createdAt.toISOString(),
          updatedAt: msg.updatedAt.toISOString(),
        })),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      },
    });
  } catch (error) {
    logger.error('Error listing messages', {
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list messages',
        },
      },
      500
    );
  }
});

/**
 * Send a message via REST (fallback)
 * POST /api/conversations/:id/messages
 */
router.post('/:id/messages', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');
    const body = await c.req.json();

    // Verify user has access
    const conversation = await ConversationService.getConversationForUser(
      conversationId,
      user.userId,
      user.role
    );

    if (!conversation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        },
        404
      );
    }

    const message = await MessageService.createMessage(
      conversationId,
      user.userId,
      user.role as ParticipantRole,
      {
        content: body.content,
        messageType: body.messageType,
        metadata: body.metadata,
      }
    );

    return c.json(
      {
        success: true,
        data: {
          messageId: message.messageId,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderRole: message.senderRole,
          content: message.content,
          messageType: message.messageType,
          readBy: message.readBy.map((r) => ({
            userId: r.userId,
            readAt: r.readAt.toISOString(),
          })),
          metadata: message.metadata,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
        },
      },
      201
    );
  } catch (error) {
    logger.error('Error sending message', {
      error: (error as Error).message,
    });
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send message',
        },
      },
      500
    );
  }
});

export default router;

