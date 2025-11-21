import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum WebhookStatus {
  PROCESSED = 'PROCESSED',
  DUPLICATE = 'DUPLICATE',
  FAILED = 'FAILED',
}

export enum WebhookProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  MOCK = 'MOCK',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IWebhookLog extends Document {
  webhookId: string;
  provider: WebhookProvider;
  eventType: string;
  eventId: string; // Provider's unique event ID
  paymentId?: string;
  status: WebhookStatus;
  signature?: string;
  payload: Record<string, any>;
  processedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const webhookLogSchema = new Schema<IWebhookLog>(
  {
    webhookId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(WebhookProvider),
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      unique: true, // Ensure provider event IDs are unique for idempotency
      index: true,
    },
    paymentId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(WebhookStatus),
      required: true,
      index: true,
    },
    signature: {
      type: String,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    processedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
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

webhookLogSchema.index({ provider: 1, eventType: 1 });
webhookLogSchema.index({ status: 1, createdAt: -1 });
webhookLogSchema.index({ paymentId: 1, createdAt: -1 });

// ============================================================================
// MODEL
// ============================================================================

export const WebhookLog: Model<IWebhookLog> =
  mongoose.models.WebhookLog || mongoose.model<IWebhookLog>('WebhookLog', webhookLogSchema);

