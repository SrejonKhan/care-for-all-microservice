import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ICampaignTotals extends Document {
  campaignId: string;
  totalAmount: number;
  totalPledges: number;
  totalDonors: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const campaignTotalsSchema = new Schema<ICampaignTotals>(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalPledges: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalDonors: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
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

campaignTotalsSchema.index({ campaignId: 1 }, { unique: true });
campaignTotalsSchema.index({ lastUpdated: -1 });

// ============================================================================
// MODEL
// ============================================================================

export const CampaignTotals: Model<ICampaignTotals> =
  mongoose.models.CampaignTotals ||
  mongoose.model<ICampaignTotals>('CampaignTotals', campaignTotalsSchema);

