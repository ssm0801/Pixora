import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEvent extends Document {
  name: string;
  description?: string;
  adminId: Types.ObjectId;
  members: Types.ObjectId[];
  pendingInvites: Types.ObjectId[];
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
    // members includes both admin and accepted users
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // users who have been invited but haven't accepted yet
    pendingInvites: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);
