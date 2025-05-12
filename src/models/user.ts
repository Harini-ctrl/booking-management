import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define enums for better type safety
export enum PreferableActivity {
  YOGA = 'YOGA',
  CLIMBING = 'CLIMBING',
  STRENGTH_TRAINING = 'STRENGTH_TRAINING',
  CROSS_FIT = 'CROSS_FIT',
  CARDIO_TRAINING = 'CARDIO_TRAINING',
  REHABILITATION = 'REHABILITATION'
}

export enum Target {
  LOSE_WEIGHT = 'LOSE_WEIGHT',
  GAIN_WEIGHT = 'GAIN_WEIGHT',
  IMPROVE_FLEXIBILITY = 'IMPROVE_FLEXIBILITY',
  GENERAL_FITNESS = 'GENERAL_FITNESS',
  BUILD_MUSCLE = 'BUILD_MUSCLE',
  REHAB_RECOVERY = 'REHAB_RECOVERY'
}

export enum UserType {
  CLIENT = 'client',
  ADMIN = 'admin'
  // Add other user types if needed
}

// Interface for User document
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName?: string;
  password: string;
  preferableActivity: PreferableActivity;
  target: Target;
  type: UserType;
  createdAt: Date;
  id: string; // Virtual property
  isValidPassword(password: string): Promise<boolean>;
}

// Create schema
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 40
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 20
    },
    password: {
      type: String,
      required: true,
      maxlength: 16
    },
    preferableActivity: {
      type: String,
      enum: Object.values(PreferableActivity),
      required: true
    },
    target: {
      type: String,
      enum: Object.values(Target),
      required: true
    },
    type: {
      type: String,
      default: UserType.CLIENT
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add a virtual property 'id' that gets/sets the _id
userSchema.virtual('id').get(function(this: IUser) {
  return this._id.toString();
});

// Hash password before saving
userSchema.pre('save', async function(this: IUser, next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to check password validity
userSchema.methods.isValidPassword = async function(this: IUser, password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

// Create and export the model
const User = mongoose.model<IUser>('User', userSchema);

export default User;