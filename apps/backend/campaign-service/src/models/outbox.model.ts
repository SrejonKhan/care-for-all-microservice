import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum OutboxStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IOutbox extends Document {
  eventId: string;
  eventType: string;
  payload: any;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const outboxSchema = new Schema<IOutbox>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(OutboxStatus),
      default: OutboxStatus.PENDING,
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      index: true,
    },
    lastError: {
      type: String,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// ============================================================================
// INDEXES
// ============================================================================

outboxSchema.index({ eventId: 1 }, { unique: true });
outboxSchema.index({ status: 1, createdAt: 1 }); // For polling PENDING events
outboxSchema.index({ status: 1, retryCount: 1 }); // For querying retry attempts

// ============================================================================
// MODEL
// ============================================================================

export const Outbox: Model<IOutbox> =
  mongoose.models.Outbox || mongoose.model<IOutbox>('Outbox', outboxSchema);

