import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

export interface IRefreshToken extends Document {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ tokenHash: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
refreshTokenSchema.index({ revoked: 1 });

// TTL index to automatically delete expired tokens after 7 days
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// ============================================================================
// MODEL
// ============================================================================

export const RefreshToken: Model<IRefreshToken> =
  mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);

