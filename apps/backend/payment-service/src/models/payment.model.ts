import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  MOCK = 'MOCK',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IPayment extends Document {
  paymentId: string;
  donationId: string;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  idempotencyKey: string;
  providerTransactionId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
  
  // State machine timestamps
  pendingAt?: Date;
  authorizedAt?: Date;
  capturedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  
  failureReason?: string;
  refundReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  canTransitionTo(newStatus: PaymentStatus): boolean;
}

// ============================================================================
// SCHEMA
// ============================================================================

const paymentSchema = new Schema<IPayment>(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    donationId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerTransactionId: {
      type: String,
      index: true,
    },
    paymentMethodId: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    
    // State machine timestamps
    pendingAt: Date,
    authorizedAt: Date,
    capturedAt: Date,
    completedAt: Date,
    failedAt: Date,
    refundedAt: Date,
    
    failureReason: String,
    refundReason: String,
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

paymentSchema.index({ donationId: 1, status: 1 });
paymentSchema.index({ provider: 1, status: 1 });
paymentSchema.index({ providerTransactionId: 1 });
paymentSchema.index({ createdAt: -1 });

// ============================================================================
// STATE MACHINE VALIDATION
// ============================================================================

/**
 * State Machine Transitions:
 * 
 * PENDING → AUTHORIZED, FAILED
 * AUTHORIZED → CAPTURED, FAILED
 * CAPTURED → COMPLETED, REFUNDED, FAILED
 * COMPLETED → REFUNDED
 * FAILED → (terminal)
 * REFUNDED → (terminal)
 */
paymentSchema.methods.canTransitionTo = function (newStatus: PaymentStatus): boolean {
  const currentStatus = this.status;
  
  const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.PENDING]: [PaymentStatus.AUTHORIZED, PaymentStatus.FAILED],
    [PaymentStatus.AUTHORIZED]: [PaymentStatus.CAPTURED, PaymentStatus.FAILED],
    [PaymentStatus.CAPTURED]: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED, PaymentStatus.FAILED],
    [PaymentStatus.COMPLETED]: [PaymentStatus.REFUNDED],
    [PaymentStatus.FAILED]: [],
    [PaymentStatus.REFUNDED]: [],
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

paymentSchema.pre('save', function (next) {
  // Set timestamp for current status
  const now = new Date();
  
  switch (this.status) {
    case PaymentStatus.PENDING:
      if (!this.pendingAt) {
        this.pendingAt = now;
      }
      break;
    case PaymentStatus.AUTHORIZED:
      if (!this.authorizedAt) {
        this.authorizedAt = now;
      }
      break;
    case PaymentStatus.CAPTURED:
      if (!this.capturedAt) {
        this.capturedAt = now;
      }
      break;
    case PaymentStatus.COMPLETED:
      if (!this.completedAt) {
        this.completedAt = now;
      }
      break;
    case PaymentStatus.FAILED:
      if (!this.failedAt) {
        this.failedAt = now;
      }
      break;
    case PaymentStatus.REFUNDED:
      if (!this.refundedAt) {
        this.refundedAt = now;
      }
      break;
  }
  
  next();
});

// ============================================================================
// MODEL
// ============================================================================

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);

