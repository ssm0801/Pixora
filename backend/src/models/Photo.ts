import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IPhoto extends Document {
  imageUrl: string;
  publicId: string;     // Cloudinary public_id (used for deletion)
  originalName: string; // Original filename from the user's device
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    imageUrl:     { type: String, required: true },
    publicId:     { type: String, required: true },
    originalName: { type: String, required: true },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Cache of already-registered models to avoid OverwriteModelError on hot-reload
const modelCache = new Map<string, Model<IPhoto>>();

/**
 * Returns a Mongoose model that writes to the collection `photos_<eventId>`.
 * Each event gets its own isolated collection in MongoDB.
 */
export const getPhotoModel = (eventId: string): Model<IPhoto> => {
  const collectionName = `photos_${eventId}`;

  if (modelCache.has(collectionName)) {
    return modelCache.get(collectionName)!;
  }

  // mongoose.models check prevents OverwriteModelError during ts-node-dev hot reloads
  const model =
    (mongoose.models[collectionName] as Model<IPhoto> | undefined) ??
    mongoose.model<IPhoto>(collectionName, PhotoSchema, collectionName);

  modelCache.set(collectionName, model);
  return model;
};
