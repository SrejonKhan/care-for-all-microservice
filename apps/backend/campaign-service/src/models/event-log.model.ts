import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum EventStatus {
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IEventLog extends Document {
  eventId: string;
  eventType: string;
  payload: any;
  status: EventStatus;
  retryCount: number;
  lastError?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const eventLogSchema = new Schema<IEventLog>(
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
      enum: Object.values(EventStatus),
      default: EventStatus.PROCESSED,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
    },
    processedAt: {
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

eventLogSchema.index({ eventId: 1 }, { unique: true });
eventLogSchema.index({ eventType: 1 });
eventLogSchema.index({ status: 1 });
eventLogSchema.index({ createdAt: -1 });

// Compound index for querying failed events
eventLogSchema.index({ status: 1, retryCount: 1 });

// ============================================================================
// MODEL
// ============================================================================

export const EventLog: Model<IEventLog> =
  mongoose.models.EventLog || mongoose.model<IEventLog>('EventLog', eventLogSchema);

