import mongoose, { Document, Schema, Types } from 'mongoose';
import crypto from 'crypto';

export interface IEvent extends Document {
  name: string;
  description?: string;
  adminId: Types.ObjectId;
  members: Types.ObjectId[];
  pendingInvites: Types.ObjectId[];
  joinRequests: Types.ObjectId[];
  code: string;
  /** userId → 'all' | folderId[]: folder access for each active member (folder IDs stored as strings) */
  memberFolderAccess: Map<string, 'all' | string[]>;
  /** userId → 'all' | folderId[]: pre-set access for pending invitees */
  pendingInviteAccess: Map<string, 'all' | string[]>;
  /** Soft-delete: true once admin deletes. Data retained 30 days then auto-purged. */
  isDeleted: boolean;
  /** When soft-delete was triggered. Auto-purge runs 30 days after this. */
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      maxlength: [100, 'Event name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pendingInvites: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    // users who requested to join via event code — awaiting admin approval
    joinRequests: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    // 8-char uppercase alphanumeric join code — unique per event
    code: {
      type: String,
      unique: true,
      index: true,
    },
    memberFolderAccess: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },
    pendingInviteAccess: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Automatically exclude soft-deleted events from all queries unless explicitly requested
EventSchema.pre(/^find/, function (this: any, next) {
  if (this.getOptions()?.includeDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Auto-generate a unique join code before first save
EventSchema.pre('save', function (next) {
  if (!this.code) {
    this.code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F7C1D9"
  }
  next();
});

export default mongoose.model<IEvent>('Event', EventSchema);
