import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFavorite extends Document {
  userId: Types.ObjectId;
  photoId: Types.ObjectId;
  eventId: Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photoId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique index: one favorite per user per photo per event
FavoriteSchema.index({ userId: 1, photoId: 1, eventId: 1 }, { unique: true });

/** Returns (or creates) the per-event favorites model for collection `favorites_<eventId>`. */
export function getFavoriteModel(eventId: string) {
  const name = `favorites_${eventId}`;
  if (mongoose.models[name]) return mongoose.model<IFavorite>(name);
  return mongoose.model<IFavorite>(name, FavoriteSchema, name);
}
