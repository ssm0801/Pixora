import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFolder extends Document {
  eventId: Types.ObjectId;
  name: string;
  createdBy: Types.ObjectId;
  memberAccess: 'all' | Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 'all' = accessible by all event members; array = specific user ObjectIds
    memberAccess: {
      type: Schema.Types.Mixed,
      default: 'all',
    },
  },
  { timestamps: true }
);

/** Returns (or creates) the per-event folder model for collection `folders_<eventId>`. */
export function getFolderModel(eventId: string) {
  const name = `folders_${eventId}`;
  if (mongoose.models[name]) return mongoose.model<IFolder>(name);
  return mongoose.model<IFolder>(name, FolderSchema, name);
}
