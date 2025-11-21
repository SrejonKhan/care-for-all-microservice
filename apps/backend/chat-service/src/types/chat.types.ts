import { ConversationStatus, ParticipantRole } from '../models/conversation.model';
import { MessageType } from '../models/message.model';

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface CreateConversationRequest {
  subject?: string;
  metadata?: Record<string, any>;
}

export interface ConversationResponse {
  conversationId: string;
  participants: ParticipantInfo[];
  createdBy: string;
  status: ConversationStatus;
  subject?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantInfo {
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  lastReadAt?: string;
}

export interface UpdateConversationRequest {
  status?: ConversationStatus;
  subject?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface SendMessageRequest {
  content: string;
  messageType?: MessageType;
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderRole: ParticipantRole;
  content: string;
  messageType: MessageType;
  readBy: ReadReceiptInfo[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ReadReceiptInfo {
  userId: string;
  readAt: string;
}

export interface MarkAsReadRequest {
  conversationId: string;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface ListConversationsQuery {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
}

export interface ListMessagesQuery {
  page?: number;
  limit?: number;
  before?: string; // messageId
  after?: string; // messageId
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface AssignAdminRequest {
  conversationId: string;
  adminId: string;
}

