import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getPhotoModel } from '../models/Photo';
import Event from '../models/Event';
import { cloudinary } from '../config/cloudinary';

// POST /api/photos/upload  (admin only, field: "photo")
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

    // Per-event collection: photos_<eventId>
    const PhotoModel = getPhotoModel(eventId);

    const count = await PhotoModel.countDocuments();
    if (count >= 500) {
      res.status(400).json({ success: false, message: 'Event has reached the 500-photo limit' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const imageUrl     = (req.file as any).path as string;
    const publicId     = (req.file as any).filename as string;
    const originalName = req.file.originalname;

    const photo = await PhotoModel.create({
      imageUrl,
      publicId,
      originalName,
      uploadedBy: req.user!._id,
    });

    res.status(201).json({ success: true, photo });
  } catch (error) {
    next(error);
  }
};

// POST /api/photos/upload-multiple  (admin only, field: "photos", up to 20)
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

    const count = await PhotoModel.countDocuments();
    if (count + files.length > 500) {
      res.status(400).json({
        success: false,
        message: `Upload would exceed 500-photo limit (current: ${count})`,
      });
      return;
    }

    const photoDocs = files.map((file) => ({
      imageUrl:     (file as any).path as string,
      publicId:     (file as any).filename as string,
      originalName: file.originalname,
      uploadedBy:   req.user!._id,
    }));

    const photos = await PhotoModel.insertMany(photoDocs);
    res.status(201).json({ success: true, photos });
  } catch (error) {
    next(error);
  }
};

// GET /api/photos?eventId=xxx  (members & admin only)
export const getPhotos = async (
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

    const userId = req.user!._id.toString();
    const isMember = event.members.some((m) => m.toString() === userId);
    if (!isMember) {
      res.status(403).json({ success: false, message: 'Access denied — not a member' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const photos = await PhotoModel.find()
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, photos });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/photos/:photoId?eventId=xxx  (admin only)
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

    await cloudinary.uploader.destroy(photo.publicId);
    await photo.deleteOne();

    res.status(200).json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
};
