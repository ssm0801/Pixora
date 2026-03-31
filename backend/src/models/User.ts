import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  name: string;            // auto-set to `firstName + ' ' + lastName` via pre-save
  email: string;
  password?: string;       // optional — Google OAuth users have no password
  googleId?: string;       // set for OAuth users
  avatar?: string;         // Google profile picture
  phone?: string;          // optional phone number
  isActive: boolean;       // false = soft-deleted; email/phone permanently reserved
  deletedAt?: Date;
  passwordHistory: string[];  // last 2 hashed passwords (current + these = last 3 total)
  comparePassword(candidatePassword: string): Promise<boolean>;
  isPasswordInHistory(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
    },
    googleId: {
      type: String,
      sparse: true,   // allows multiple null values while keeping uniqueness for non-null
      unique: true,
    },
    avatar: { type: String },
    phone: { type: String, trim: true, maxlength: [20, 'Phone cannot exceed 20 characters'] },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date },
    passwordHistory: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Keep `name` in sync with firstName + lastName
UserSchema.pre('save', async function (next) {
  if (this.isModified('firstName') || this.isModified('lastName')) {
    this.name = `${this.firstName} ${this.lastName}`.trim();
  }
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if candidate matches current password or any of the last 2 history entries (3 total)
UserSchema.methods.isPasswordInHistory = async function (
  candidatePassword: string
): Promise<boolean> {
  const hashes: string[] = [this.password, ...(this.passwordHistory || [])].filter(Boolean);
  for (const hash of hashes) {
    if (await bcrypt.compare(candidatePassword, hash)) return true;
  }
  return false;
};

export default mongoose.model<IUser>('User', UserSchema);
