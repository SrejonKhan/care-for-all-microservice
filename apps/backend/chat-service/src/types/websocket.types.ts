import { ParticipantRole } from '../models/conversation.model';
import { MessageType } from '../models/message.model';

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

export enum WebSocketMessageType {
  // Client to Server
  MESSAGE = 'message',
  TYPING = 'typing',
  READ = 'read',
  PING = 'ping',

  // Server to Client
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  READ_RECEIPT = 'read_receipt',
  SYSTEM = 'system',
  ERROR = 'error',
  PONG = 'pong',
  CONVERSATION_UPDATED = 'conversation_updated',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
}

// ============================================================================
// CLIENT TO SERVER MESSAGES
// ============================================================================

export interface ClientMessage {
  type: WebSocketMessageType.MESSAGE;
  content: string;
  messageType?: MessageType;
  metadata?: Record<string, any>;
}

export interface ClientTyping {
  type: WebSocketMessageType.TYPING;
  isTyping: boolean;
}

export interface ClientRead {
  type: WebSocketMessageType.READ;
  messageId?: string; // If not provided, mark all as read
}

export interface ClientPing {
  type: WebSocketMessageType.PING;
}

export type ClientWebSocketMessage =
  | ClientMessage
  | ClientTyping
  | ClientRead
  | ClientPing;

// ============================================================================
// SERVER TO CLIENT MESSAGES
// ============================================================================

export interface ServerMessageSent {
  type: WebSocketMessageType.MESSAGE_SENT;
  messageId: string;
  conversationId: string;
  senderId: string;
  senderRole: ParticipantRole;
  content: string;
  messageType: MessageType;
  createdAt: string;
}

export interface ServerMessageReceived {
  type: WebSocketMessageType.MESSAGE_RECEIVED;
  messageId: string;
  conversationId: string;
  senderId: string;
  senderRole: ParticipantRole;
  content: string;
  messageType: MessageType;
  createdAt: string;
}

export interface ServerTypingStart {
  type: WebSocketMessageType.TYPING_START;
  userId: string;
  userName?: string;
}

export interface ServerTypingStop {
  type: WebSocketMessageType.TYPING_STOP;
  userId: string;
}

export interface ServerReadReceipt {
  type: WebSocketMessageType.READ_RECEIPT;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface ServerSystemMessage {
  type: WebSocketMessageType.SYSTEM;
  message: string;
  timestamp: string;
}

export interface ServerError {
  type: WebSocketMessageType.ERROR;
  code: string;
  message: string;
}

export interface ServerPong {
  type: WebSocketMessageType.PONG;
  timestamp: string;
}

export interface ServerConversationUpdated {
  type: WebSocketMessageType.CONVERSATION_UPDATED;
  conversationId: string;
  status?: string;
  participants?: Array<{
    userId: string;
    role: ParticipantRole;
  }>;
}

export interface ServerUserJoined {
  type: WebSocketMessageType.USER_JOINED;
  userId: string;
  role: ParticipantRole;
  userName?: string;
}

export interface ServerUserLeft {
  type: WebSocketMessageType.USER_LEFT;
  userId: string;
}

export type ServerWebSocketMessage =
  | ServerMessageSent
  | ServerMessageReceived
  | ServerTypingStart
  | ServerTypingStop
  | ServerReadReceipt
  | ServerSystemMessage
  | ServerError
  | ServerPong
  | ServerConversationUpdated
  | ServerUserJoined
  | ServerUserLeft;

// ============================================================================
// WEBSOCKET CONNECTION INFO
// ============================================================================

export interface WebSocketConnectionInfo {
  userId: string;
  role: ParticipantRole;
  conversationId: string;
  connectedAt: Date;
}

