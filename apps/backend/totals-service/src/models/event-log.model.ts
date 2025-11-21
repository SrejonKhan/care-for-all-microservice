import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum EventStatus {
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IEventLog extends Document {
  eventId: string;
  eventType: string;
  payload: any;
  status: EventStatus;
  processedAt: Date;
  errorMessage?: string;
  retryCount: number;
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
      required: true,
      index: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
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
    toObject: {
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

eventLogSchema.index({ eventType: 1, status: 1 });
eventLogSchema.index({ processedAt: -1 });

// ============================================================================
// MODEL
// ============================================================================

export const EventLog: Model<IEventLog> =
  mongoose.models.EventLog || mongoose.model<IEventLog>('EventLog', eventLogSchema);

