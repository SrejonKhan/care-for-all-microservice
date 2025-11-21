import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  USER = 'USER',
  CAMPAIGN_OWNER = 'CAMPAIGN_OWNER',
  ADMIN = 'ADMIN',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IUser extends Document {
  email: string | null;
  passwordHash: string | null;
  name: string;
  role: UserRole;
  isGuest: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete (ret as any)._id;
        delete (ret as any).__v;
        delete (ret as any).passwordHash; // Never expose password hash
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

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isGuest: 1 });
userSchema.index({ createdAt: -1 });

// ============================================================================
// MODEL
// ============================================================================

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

