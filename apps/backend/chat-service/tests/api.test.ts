import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { ConversationService } from '../src/services/conversation.service';
import { MessageService } from '../src/services/message.service';
import { ParticipantRole } from '../src/models/conversation.model';

// Test database connection
const TEST_DB_URL =
  process.env.DATABASE_URL || 'mongodb://localhost:27017/chat-service-test';

describe('Chat Service API Integration', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URL);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('should create conversation and send messages', async () => {
    // Create conversation
    const conversation = await ConversationService.createConversation(
      'user_api',
      ParticipantRole.USER,
      { subject: 'API Test Conversation' }
    );

    expect(conversation).toBeDefined();
    expect(conversation.conversationId).toBeDefined();

    // Send messages
    const message1 = await MessageService.createMessage(
      conversation.conversationId,
      'user_api',
      ParticipantRole.USER,
      { content: 'First message' }
    );

    const message2 = await MessageService.createMessage(
      conversation.conversationId,
      'user_api',
      ParticipantRole.USER,
      { content: 'Second message' }
    );

    expect(message1).toBeDefined();
    expect(message2).toBeDefined();

    // List messages
    const messages = await MessageService.listMessages(conversation.conversationId, {
      page: 1,
      limit: 10,
    });

    expect(messages.messages.length).toBeGreaterThanOrEqual(2);
  });

  test('should handle admin assignment', async () => {
    const conversation = await ConversationService.createConversation(
      'user_admin',
      ParticipantRole.USER,
      {}
    );

    // Add admin
    const updated = await ConversationService.addParticipant(
      conversation.conversationId,
      'admin_api',
      ParticipantRole.ADMIN
    );

    expect(updated).toBeDefined();
    expect(updated?.participants).toHaveLength(2);
    expect(
      updated?.participants.some((p) => p.userId === 'admin_api' && p.role === ParticipantRole.ADMIN)
    ).toBe(true);
  });

  test('should handle read receipts', async () => {
    const conversation = await ConversationService.createConversation(
      'user_receipt',
      ParticipantRole.USER,
      {}
    );

    const message = await MessageService.createMessage(
      conversation.conversationId,
      'user_receipt',
      ParticipantRole.USER,
      { content: 'Read receipt test' }
    );

    // Mark as read
    await MessageService.markAsRead(message.messageId, 'user_receipt_reader');
    await ConversationService.updateLastRead(conversation.conversationId, 'user_receipt_reader');

    const updated = await MessageService.getMessageById(message.messageId);
    expect(updated?.readBy.length).toBe(1);
  });
});

