import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum DonationStatus {
  PENDING = 'PENDING',
  BALANCE_CHECK = 'BALANCE_CHECK',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IDonation extends Document {
  campaignId: string;
  donorId?: string; // Optional for guest donations
  donorName?: string; // For display purposes
  donorEmail?: string; // For guest donations
  amount: number;
  status: DonationStatus;
  isAnonymous: boolean;
  isGuest: boolean;
  
  // Bank mock data
  bankAccountId?: string;
  
  // Metadata
  failureReason?: string;
  refundReason?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  authorizedAt?: Date;
  capturedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const donationSchema = new Schema<IDonation>(
  {
    campaignId: {
      type: String,
      required: true,
      index: true,
    },
    donorId: {
      type: String,
      index: true,
      sparse: true, // Allow null for guest donations
    },
    donorName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    donorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(DonationStatus),
      default: DonationStatus.PENDING,
      index: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    isGuest: {
      type: Boolean,
      default: false,
      index: true,
    },
    bankAccountId: {
      type: String,
      trim: true,
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    refundReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    authorizedAt: {
      type: Date,
    },
    capturedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    refundedAt: {
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

donationSchema.index({ campaignId: 1, createdAt: -1 });
donationSchema.index({ donorId: 1, createdAt: -1 });
donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ isGuest: 1, donorEmail: 1 });

// ============================================================================
// METHODS
// ============================================================================

donationSchema.methods.canTransitionTo = function (newStatus: DonationStatus): boolean {
  const validTransitions: Record<DonationStatus, DonationStatus[]> = {
    [DonationStatus.PENDING]: [DonationStatus.BALANCE_CHECK, DonationStatus.FAILED],
    [DonationStatus.BALANCE_CHECK]: [DonationStatus.AUTHORIZED, DonationStatus.FAILED],
    [DonationStatus.AUTHORIZED]: [DonationStatus.CAPTURED, DonationStatus.FAILED],
    [DonationStatus.CAPTURED]: [DonationStatus.COMPLETED, DonationStatus.FAILED],
    [DonationStatus.COMPLETED]: [DonationStatus.REFUNDED],
    [DonationStatus.FAILED]: [],
    [DonationStatus.REFUNDED]: [],
  };

  return validTransitions[this.status]?.includes(newStatus) || false;
};

// ============================================================================
// MODEL
// ============================================================================

export const Donation: Model<IDonation> =
  mongoose.models.Donation || mongoose.model<IDonation>('Donation', donationSchema);

