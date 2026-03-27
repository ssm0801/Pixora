import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getPhotoModel } from '../models/Photo';
import { getFavoriteModel } from '../models/Favorite';
import Event from '../models/Event';
import { cloudinary, uploadBufferToCloudinary } from '../config/cloudinary';
import { Types } from 'mongoose';

// ── Helper: verify membership and return event ─────────────────────────────────
async function requireMembership(req: AuthRequest, res: Response, eventId: string) {
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, message: 'Event not found' });
    return null;
  }
  const userId = req.user!._id.toString();
  const isMember = event.members.some((m) => m.toString() === userId);
  if (!isMember) {
    res.status(403).json({ success: false, message: 'Access denied — not a member' });
    return null;
  }
  return event;
}

// ── Helper: extract EXIF metadata from buffer ──────────────────────────────────
async function extractExif(buffer: Buffer) {
  try {
    const exifr = await import('exifr');
    const exif = await exifr.default.parse(buffer, {
      pick: [
        'DateTimeOriginal',
        'GPSLatitude',
        'GPSLongitude',
        'Make',
        'Model',
        'ExifImageWidth',
        'ExifImageHeight',
      ],
    });
    if (!exif) return undefined;

    return {
      capturedAt: exif.DateTimeOriginal
        ? new Date(exif.DateTimeOriginal)
        : undefined,
      lat: exif.GPSLatitude ?? undefined,
      lng: exif.GPSLongitude ?? undefined,
      cameraMake: exif.Make ?? undefined,
      cameraModel: exif.Model ?? undefined,
      width: exif.ExifImageWidth ?? undefined,
      height: exif.ExifImageHeight ?? undefined,
    };
  } catch {
    return undefined;
  }
}

// ── POST /api/photos/upload  (admin only, field: "photo") ─────────────────────
export const uploadPhoto = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.body as { eventId: string };
    const adminId = req.user!._id.toString();

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== adminId) {
      res.status(403).json({ success: false, message: 'Only the admin can upload photos' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const count = await PhotoModel.countDocuments({ isDeleted: false });
    if (count >= 500) {
      res.status(400).json({ success: false, message: 'Event has reached the 500-item limit' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const buffer = req.file.buffer;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const isVideo = req.file.mimetype.startsWith('video/');

    // Extract EXIF only for images
    const exifMeta = isVideo ? undefined : await extractExif(buffer);

    // Upload to Cloudinary — resource_type:'auto' handles both images and videos
    const uploadResult = await uploadBufferToCloudinary(buffer, {
      folder: 'pixora',
      use_filename: true,
      unique_filename: true,
      resource_type: 'auto',
    });

    const metadata = {
      ...(exifMeta ?? {}),
      fileSize,
      width: exifMeta?.width ?? uploadResult.width,
      height: exifMeta?.height ?? uploadResult.height,
    };

    const photo = await PhotoModel.create({
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      originalName,
      uploadedBy: req.user!._id,
      metadata,
      mediaType: isVideo ? 'video' : 'photo',
      isPublic: false,
    });

    res.status(201).json({ success: true, photo });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/photos/upload-multiple  (admin only, field: "photos", up to 20) ─
export const uploadMultiplePhotos = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.body as { eventId: string };
    const adminId = req.user!._id.toString();

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== adminId) {
      res.status(403).json({ success: false, message: 'Only the admin can upload photos' });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const count = await PhotoModel.countDocuments({ isDeleted: false });
    if (count + files.length > 500) {
      res.status(400).json({
        success: false,
        message: `Upload would exceed 500-item limit (current: ${count})`,
      });
      return;
    }

    // Process each file: extract EXIF (images only) and upload to Cloudinary
    const photoDocs = await Promise.all(
      files.map(async (file) => {
        const buffer = file.buffer;
        const fileSize = file.size;
        const isVideo = file.mimetype.startsWith('video/');

        const exifMeta = isVideo ? undefined : await extractExif(buffer);

        const uploadResult = await uploadBufferToCloudinary(buffer, {
          folder: 'pixora',
          use_filename: true,
          unique_filename: true,
          resource_type: 'auto',
        });

        const metadata = {
          ...(exifMeta ?? {}),
          fileSize,
          width: exifMeta?.width ?? uploadResult.width,
          height: exifMeta?.height ?? uploadResult.height,
        };

        return {
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          originalName: file.originalname,
          uploadedBy: req.user!._id,
          metadata,
          mediaType: isVideo ? 'video' : 'photo',
          isPublic: false,
        };
      })
    );

    const photos = await PhotoModel.insertMany(photoDocs);
    res.status(201).json({ success: true, photos });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/photos?eventId=xxx  (members & admin) ───────────────────────────
// Admin: sees all non-deleted + can request deleted with ?isDeleted=true
// Members: sees only isPublic:true, isDeleted:false
export const getPhotos = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId, isDeleted: isDeletedParam } = req.query as {
      eventId: string;
      isDeleted?: string;
    };

    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await requireMembership(req, res, eventId);
    if (!event) return;

    const isAdmin = event.adminId.toString() === req.user!._id.toString();
    const PhotoModel = getPhotoModel(eventId);

    let filter: Record<string, unknown>;

    if (isAdmin) {
      // Admin can filter by isDeleted; default shows non-deleted active photos
      if (isDeletedParam === 'true') {
        filter = { isDeleted: true };
      } else {
        filter = { isDeleted: false };
      }
    } else {
      // Non-admin: derive visible photos from this member's event-level folder access.
      const userId = req.user!._id.toString();
      const accessLevel = event.memberFolderAccess?.get(userId) ?? 'all';

      if (accessLevel === 'all') {
        // All folders + all public photos
        filter = {
          isDeleted: false,
          $or: [
            { isPublic: true },
            { folderId: { $exists: true, $ne: null } },
          ],
        };
      } else if (Array.isArray(accessLevel) && (accessLevel as string[]).length > 0) {
        // Only photos in the granted folders, plus explicitly public photos
        // accessLevel contains plain folder ID strings — convert to ObjectIds for the query
        const folderObjectIds = (accessLevel as string[]).map((id) => new Types.ObjectId(id));
        filter = {
          isDeleted: false,
          $or: [
            { isPublic: true },
            { folderId: { $in: folderObjectIds } },
          ],
        };
      } else {
        // No folder access granted — only explicitly public photos
        filter = { isPublic: true, isDeleted: false };
      }
    }

    const photos = await PhotoModel.find(filter)
      .populate('uploadedBy', 'name')
      .sort({ 'metadata.capturedAt': -1, createdAt: -1 });

    res.status(200).json({ success: true, photos });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/photos/:photoId?eventId=xxx  (admin: soft-delete) ────────────
export const deletePhoto = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.query as { eventId: string };
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the admin can delete photos' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const photo = await PhotoModel.findById(req.params.photoId);
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    // Soft-delete: move to recycle bin
    photo.isDeleted = true;
    photo.deletedAt = new Date();
    await photo.save();

    res.status(200).json({ success: true, message: 'Photo moved to recycle bin' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/photos/trash?eventId=xxx  (admin only) ──────────────────────────
// Returns soft-deleted photos within the 24h window (excludes expired)
export const getTrash = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.query as { eventId: string };
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const PhotoModel = getPhotoModel(eventId);

    // Note: A cleanup cron could permanently delete photos where deletedAt < twentyFourHoursAgo.
    // Here we only return photos still within the 24h restore window.
    const photos = await PhotoModel.find({
      isDeleted: true,
      deletedAt: { $gte: twentyFourHoursAgo },
    })
      .populate('uploadedBy', 'name')
      .sort({ deletedAt: -1 });

    res.status(200).json({ success: true, photos });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/photos/:photoId/restore?eventId=xxx  (admin only) ──────────────
export const restorePhoto = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.query as { eventId: string };
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const photo = await PhotoModel.findById(req.params.photoId);
    if (!photo || !photo.isDeleted) {
      res.status(404).json({ success: false, message: 'Photo not found in trash' });
      return;
    }

    // Check within 24h window
    if (photo.deletedAt) {
      const age = Date.now() - photo.deletedAt.getTime();
      if (age > 24 * 60 * 60 * 1000) {
        res.status(400).json({ success: false, message: 'Restore window has expired (24h)' });
        return;
      }
    }

    photo.isDeleted = false;
    photo.deletedAt = undefined;
    await photo.save();

    res.status(200).json({ success: true, message: 'Photo restored', photo });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/photos/:photoId/permanent?eventId=xxx  (admin only) ──────────
export const permanentDeletePhoto = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.query as { eventId: string };
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const photo = await PhotoModel.findById(req.params.photoId);
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    // Permanently destroy from Cloudinary and remove document
    await cloudinary.uploader.destroy(photo.publicId, {
      resource_type: photo.mediaType === 'video' ? 'video' : 'image',
    });
    await photo.deleteOne();

    // Remove any favorites for this photo
    const FavoriteModel = getFavoriteModel(eventId);
    await FavoriteModel.deleteMany({
      photoId: photo._id,
      eventId: new Types.ObjectId(eventId),
    });

    res.status(200).json({ success: true, message: 'Photo permanently deleted' });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/photos/:photoId/visibility?eventId=xxx  (admin only) ──────────
export const toggleVisibility = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.query as { eventId: string };
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const photo = await PhotoModel.findById(req.params.photoId);
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    photo.isPublic = !photo.isPublic;
    await photo.save();

    res.status(200).json({ success: true, photo, message: `Photo is now ${photo.isPublic ? 'public' : 'private'}` });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/photos/:photoId/favorite?eventId=xxx  (members & admin) ────────
export const toggleFavorite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.query as { eventId: string };
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await requireMembership(req, res, eventId);
    if (!event) return;

    const userId = req.user!._id;
    const photoId = new Types.ObjectId(req.params.photoId);
    const eventObjId = new Types.ObjectId(eventId);

    const FavoriteModel = getFavoriteModel(eventId);
    const existing = await FavoriteModel.findOne({ userId, photoId, eventId: eventObjId });
    if (existing) {
      await existing.deleteOne();
      res.status(200).json({ success: true, favorited: false, message: 'Removed from favorites' });
    } else {
      await FavoriteModel.create({ userId, photoId, eventId: eventObjId });
      res.status(201).json({ success: true, favorited: true, message: 'Added to favorites' });
    }
  } catch (error) {
    next(error);
  }
};

// ── GET /api/photos/favorites?eventId=xxx  (members & admin) ─────────────────
export const getFavorites = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.query as { eventId: string };
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await requireMembership(req, res, eventId);
    if (!event) return;

    const userId = req.user!._id;
    const eventObjId = new Types.ObjectId(eventId);

    const FavoriteModel = getFavoriteModel(eventId);
    const favorites = await FavoriteModel.find({ userId, eventId: eventObjId }).sort({ createdAt: -1 });
    const photoIds = favorites.map((f) => f.photoId);

    const PhotoModel = getPhotoModel(eventId);
    const isAdmin = event.adminId.toString() === userId.toString();

    const photoFilter: Record<string, unknown> = {
      _id: { $in: photoIds },
      isDeleted: false,
    };
    if (!isAdmin) {
      photoFilter.isPublic = true;
    }

    const photos = await PhotoModel.find(photoFilter)
      .populate('uploadedBy', 'name')
      .sort({ 'metadata.capturedAt': -1, createdAt: -1 });

    res.status(200).json({ success: true, photos });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/photos/sign-upload  (admin only) ────────────────────────────────
// Returns signed Cloudinary upload params so the browser can upload directly
// to Cloudinary without routing the file through the server (single network hop).
// Signature is valid for ~60 min and can be reused for a whole upload session.
export const getUploadSignature = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.body as { eventId: string };
    const adminId = req.user!._id.toString();

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== adminId) {
      res.status(403).json({ success: false, message: 'Only the admin can upload media' });
      return;
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'pixora';
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET!
    );

    res.status(200).json({
      success: true,
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/photos/save-direct  (admin only) ───────────────────────────────
// Saves a photo/video record after the browser has uploaded directly to Cloudinary.
export const saveDirectUpload = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      eventId, publicId, secureUrl, originalName,
      width, height, fileSize, resourceType,
    } = req.body as {
      eventId: string; publicId: string; secureUrl: string; originalName: string;
      width?: number; height?: number; fileSize?: number; resourceType?: string;
    };

    const adminId = req.user!._id.toString();

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== adminId) {
      res.status(403).json({ success: false, message: 'Only the admin can upload media' });
      return;
    }

    // Verify the upload came from the pixora folder
    if (!publicId.startsWith('pixora/')) {
      res.status(400).json({ success: false, message: 'Invalid upload origin' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const photo = await PhotoModel.create({
      imageUrl: secureUrl,
      publicId,
      originalName,
      uploadedBy: req.user!._id,
      metadata: { fileSize, width, height },
      mediaType: resourceType === 'video' ? 'video' : 'photo',
      isPublic: false,
    });

    res.status(201).json({ success: true, photo });
  } catch (error) {
    next(error);
  }
};
