import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { MessageService } from '../src/services/message.service';
import { ConversationService } from '../src/services/conversation.service';
import { ParticipantRole } from '../src/models/conversation.model';
import { MessageType } from '../src/models/message.model';

// Test database connection
const TEST_DB_URL =
  process.env.DATABASE_URL || 'mongodb://localhost:27017/chat-service-test';

describe('MessageService', () => {
  let conversationId: string;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URL);

    // Create a test conversation
    const conversation = await ConversationService.createConversation(
      'user_msg',
      ParticipantRole.USER,
      {}
    );
    conversationId = conversation.conversationId;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('should create a message', async () => {
    const message = await MessageService.createMessage(
      conversationId,
      'user_msg',
      ParticipantRole.USER,
      {
        content: 'Hello, this is a test message',
        messageType: MessageType.TEXT,
      }
    );

    expect(message).toBeDefined();
    expect(message.messageId).toBeDefined();
    expect(message.conversationId).toBe(conversationId);
    expect(message.senderId).toBe('user_msg');
    expect(message.content).toBe('Hello, this is a test message');
    expect(message.messageType).toBe(MessageType.TEXT);
  });

  test('should get message by ID', async () => {
    const created = await MessageService.createMessage(
      conversationId,
      'user_get',
      ParticipantRole.USER,
      { content: 'Get test message' }
    );

    const found = await MessageService.getMessageById(created.messageId);

    expect(found).toBeDefined();
    expect(found?.messageId).toBe(created.messageId);
    expect(found?.content).toBe('Get test message');
  });

  test('should list messages for a conversation', async () => {
    // Create multiple messages
    await MessageService.createMessage(conversationId, 'user_list1', ParticipantRole.USER, {
      content: 'Message 1',
    });
    await MessageService.createMessage(conversationId, 'user_list2', ParticipantRole.USER, {
      content: 'Message 2',
    });

    const result = await MessageService.listMessages(conversationId, {
      page: 1,
      limit: 10,
    });

    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  test('should mark message as read', async () => {
    const message = await MessageService.createMessage(
      conversationId,
      'user_read',
      ParticipantRole.USER,
      { content: 'Read test' }
    );

    const updated = await MessageService.markAsRead(
      message.messageId,
      'user_read_other'
    );

    expect(updated).toBeDefined();
    expect(updated?.readBy.length).toBe(1);
    expect(updated?.readBy[0].userId).toBe('user_read_other');
  });

  test('should mark all messages as read', async () => {
    // Create some messages
    await MessageService.createMessage(conversationId, 'user_all1', ParticipantRole.USER, {
      content: 'Message 1',
    });
    await MessageService.createMessage(conversationId, 'user_all2', ParticipantRole.USER, {
      content: 'Message 2',
    });

    const count = await MessageService.markAllAsRead(conversationId, 'user_all_read');

    expect(count).toBeGreaterThan(0);
  });

  test('should get unread message count', async () => {
    // Create a message from another user
    await MessageService.createMessage(conversationId, 'user_unread', ParticipantRole.USER, {
      content: 'Unread message',
    });

    const count = await MessageService.getUnreadCount(conversationId, 'user_count');

    expect(count).toBeGreaterThan(0);
  });

  test('should not count own messages as unread', async () => {
    await MessageService.createMessage(conversationId, 'user_own', ParticipantRole.USER, {
      content: 'Own message',
    });

    const count = await MessageService.getUnreadCount(conversationId, 'user_own');

    expect(count).toBe(0);
  });
});

