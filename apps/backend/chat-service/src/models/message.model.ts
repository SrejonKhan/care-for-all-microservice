import mongoose, { Schema, Document, Model } from 'mongoose';
import { ParticipantRole } from './conversation.model';

// ============================================================================
// ENUMS
// ============================================================================

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  FILE = 'FILE',
}

// Re-export ParticipantRole for convenience
export { ParticipantRole };

// ============================================================================
// INTERFACES
// ============================================================================

export interface IReadReceipt {
  userId: string;
  readAt: Date;
}

export interface IMessage extends Document {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderRole: ParticipantRole;
  content: string;
  messageType: MessageType;
  readBy: IReadReceipt[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const readReceiptSchema = new Schema<IReadReceipt>(
  {
    userId: {
      type: String,
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: Object.values(ParticipantRole),
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    readBy: {
      type: [readReceiptSchema],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, messageId: 1 });

// ============================================================================
// MODEL
// ============================================================================

export const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>('Message', messageSchema);

