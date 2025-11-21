import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { ConversationService } from '../src/services/conversation.service';
import { ParticipantRole, ConversationStatus } from '../src/models/conversation.model';

// Test database connection
const TEST_DB_URL =
  process.env.DATABASE_URL || 'mongodb://localhost:27017/chat-service-test';

describe('ConversationService', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URL);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('should create a conversation', async () => {
    const conversation = await ConversationService.createConversation(
      'user_123',
      ParticipantRole.USER,
      {
        subject: 'Test Conversation',
        metadata: { test: true },
      }
    );

    expect(conversation).toBeDefined();
    expect(conversation.conversationId).toBeDefined();
    expect(conversation.createdBy).toBe('user_123');
    expect(conversation.status).toBe(ConversationStatus.ACTIVE);
    expect(conversation.participants).toHaveLength(1);
    expect(conversation.participants[0].userId).toBe('user_123');
    expect(conversation.participants[0].role).toBe(ParticipantRole.USER);
  });

  test('should get conversation by ID', async () => {
    const created = await ConversationService.createConversation(
      'user_456',
      ParticipantRole.USER,
      { subject: 'Get Test' }
    );

    const found = await ConversationService.getConversationById(
      created.conversationId
    );

    expect(found).toBeDefined();
    expect(found?.conversationId).toBe(created.conversationId);
    expect(found?.createdBy).toBe('user_456');
  });

  test('should verify user access to conversation', async () => {
    const conversation = await ConversationService.createConversation(
      'user_789',
      ParticipantRole.USER,
      {}
    );

    // User should have access
    const userAccess = await ConversationService.getConversationForUser(
      conversation.conversationId,
      'user_789',
      'USER'
    );
    expect(userAccess).toBeDefined();

    // Admin should have access
    const adminAccess = await ConversationService.getConversationForUser(
      conversation.conversationId,
      'admin_123',
      'ADMIN'
    );
    expect(adminAccess).toBeDefined();

    // Other user should not have access
    const otherUserAccess = await ConversationService.getConversationForUser(
      conversation.conversationId,
      'user_999',
      'USER'
    );
    expect(otherUserAccess).toBeNull();
  });

  test('should list conversations for a user', async () => {
    // Create conversations for different users
    await ConversationService.createConversation('user_list1', ParticipantRole.USER, {});
    await ConversationService.createConversation('user_list2', ParticipantRole.USER, {});

    const result = await ConversationService.listConversations(
      'user_list1',
      'USER',
      { page: 1, limit: 10 }
    );

    expect(result.conversations.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  test('should add participant to conversation', async () => {
    const conversation = await ConversationService.createConversation(
      'user_add',
      ParticipantRole.USER,
      {}
    );

    const updated = await ConversationService.addParticipant(
      conversation.conversationId,
      'admin_add',
      ParticipantRole.ADMIN
    );

    expect(updated).toBeDefined();
    expect(updated?.participants).toHaveLength(2);
    expect(updated?.participants.some((p) => p.userId === 'admin_add')).toBe(
      true
    );
  });

  test('should update conversation', async () => {
    const conversation = await ConversationService.createConversation(
      'user_update',
      ParticipantRole.USER,
      { subject: 'Original' }
    );

    const updated = await ConversationService.updateConversation(
      conversation.conversationId,
      {
        status: ConversationStatus.CLOSED,
        subject: 'Updated',
      }
    );

    expect(updated).toBeDefined();
    expect(updated?.status).toBe(ConversationStatus.CLOSED);
    expect(updated?.subject).toBe('Updated');
  });

  test('should update last read timestamp', async () => {
    const conversation = await ConversationService.createConversation(
      'user_read',
      ParticipantRole.USER,
      {}
    );

    const updated = await ConversationService.updateLastRead(
      conversation.conversationId,
      'user_read'
    );

    expect(updated).toBeDefined();
    const participant = updated?.participants.find(
      (p) => p.userId === 'user_read'
    );
    expect(participant?.lastReadAt).toBeDefined();
  });
});

