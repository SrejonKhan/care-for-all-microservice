import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface ICampaign extends Document {
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  status: CampaignStatus;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  category?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const campaignSchema = new Schema<ICampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000,
    },
    goalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
    },
    ownerId: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 500,
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

campaignSchema.index({ ownerId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ startDate: 1, endDate: 1 });
campaignSchema.index({ category: 1 });

// Compound index for common queries
campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ ownerId: 1, status: 1 });

// ============================================================================
// METHODS
// ============================================================================

// Validate date range
campaignSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// ============================================================================
// MODEL
// ============================================================================

export const Campaign: Model<ICampaign> =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', campaignSchema);

