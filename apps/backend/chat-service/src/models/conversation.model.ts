import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum ParticipantRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IParticipant {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastReadAt?: Date;
}

export interface IConversation extends Document {
  conversationId: string;
  participants: IParticipant[];
  createdBy: string;
  status: ConversationStatus;
  subject?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const participantSchema = new Schema<IParticipant>(
  {
    userId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ParticipantRole),
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastReadAt: {
      type: Date,
    },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    participants: {
      type: [participantSchema],
      required: true,
      validate: {
        validator: (participants: IParticipant[]) => participants.length > 0,
        message: 'Conversation must have at least one participant',
      },
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ConversationStatus),
      default: ConversationStatus.ACTIVE,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 200,
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
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ createdBy: 1, status: 1 });
conversationSchema.index({ status: 1, updatedAt: -1 });

// ============================================================================
// MODEL
// ============================================================================

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', conversationSchema);

