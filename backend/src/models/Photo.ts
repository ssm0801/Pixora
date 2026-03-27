import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IPhotoMetadata {
  capturedAt?: Date;
  lat?: number;
  lng?: number;
  cameraMake?: string;
  cameraModel?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface IPhoto extends Document {
  imageUrl: string;
  publicId: string;     // Cloudinary public_id (used for deletion)
  originalName: string; // Original filename from the user's device
  uploadedBy: Types.ObjectId;
  metadata?: IPhotoMetadata;
  mediaType: 'photo' | 'video';
  isPublic: boolean;    // private vault: false = hidden from non-admins
  isDeleted: boolean;   // recycle bin soft-delete
  deletedAt?: Date;
  folderId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoMetadataSchema = new Schema<IPhotoMetadata>(
  {
    capturedAt:  { type: Date },
    lat:         { type: Number },
    lng:         { type: Number },
    cameraMake:  { type: String },
    cameraModel: { type: String },
    width:       { type: Number },
    height:      { type: Number },
    fileSize:    { type: Number },
  },
  { _id: false }
);

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
    metadata:  { type: PhotoMetadataSchema },
    mediaType: { type: String, enum: ['photo', 'video'], default: 'photo' },
    isPublic:  { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    folderId:  { type: Schema.Types.ObjectId, ref: 'Folder' },
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
