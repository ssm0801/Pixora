import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getFolderModel } from '../models/Folder';
import { getPhotoModel } from '../models/Photo';
import Event from '../models/Event';
import { Types } from 'mongoose';

// ── Helper: get event and verify admin ────────────────────────────────────────
async function requireAdmin(req: AuthRequest, res: Response, eventId: string) {
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, message: 'Event not found' });
    return null;
  }
  if (event.adminId.toString() !== req.user!._id.toString()) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return null;
  }
  return event;
}

// ── Helper: get event and verify membership ───────────────────────────────────
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

// ── POST /api/events/:eventId/folders  (admin only) ──────────────────────────
export const createFolder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { name } = req.body as { name: string };

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Folder name is required' });
      return;
    }

    const event = await requireAdmin(req, res, eventId);
    if (!event) return;

    const FolderModel = getFolderModel(eventId);
    const folder = await FolderModel.create({
      eventId: new Types.ObjectId(eventId),
      name: name.trim(),
      createdBy: req.user!._id,
      memberAccess: 'all',
    });

    res.status(201).json({ success: true, folder });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/events/:eventId/folders  (all event members) ────────────────────
export const listFolders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;

    const event = await requireMembership(req, res, eventId);
    if (!event) return;

    const userId = req.user!._id.toString();
    const isAdmin = event.adminId.toString() === userId;

    const FolderModel = getFolderModel(eventId);
    const allFolders = await FolderModel.find({
      eventId: new Types.ObjectId(eventId),
    }).sort({ createdAt: 1 });

    // Filter by the member's event-level folder access grant
    let folders: typeof allFolders;
    if (isAdmin) {
      folders = allFolders;
    } else {
      const accessLevel = event.memberFolderAccess?.get(userId) ?? 'all';
      if (accessLevel === 'all') {
        folders = allFolders;
      } else if (Array.isArray(accessLevel)) {
        const grantedIds = new Set(accessLevel as string[]);
        folders = allFolders.filter((f) => grantedIds.has(f._id.toString()));
      } else {
        folders = [];
      }
    }

    res.status(200).json({ success: true, folders });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/events/:eventId/folders/:folderId/access  (admin only) ─────────
export const updateFolderAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId, folderId } = req.params;
    const { memberAccess } = req.body as { memberAccess: 'all' | string[] };

    const event = await requireAdmin(req, res, eventId);
    if (!event) return;

    const FolderModel = getFolderModel(eventId);
    const folder = await FolderModel.findOne({
      _id: folderId,
      eventId: new Types.ObjectId(eventId),
    });
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found' });
      return;
    }

    if (memberAccess === 'all') {
      folder.memberAccess = 'all';
    } else if (Array.isArray(memberAccess)) {
      folder.memberAccess = memberAccess.map((id) => new Types.ObjectId(id));
    } else {
      res.status(400).json({ success: false, message: 'memberAccess must be "all" or an array of user IDs' });
      return;
    }

    await folder.save();
    res.status(200).json({ success: true, folder });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/events/:eventId/folders/:folderId  (admin only) ───────────────
// Photos in the folder become unfoldered (folderId unset), not deleted.
export const deleteFolder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId, folderId } = req.params;

    const event = await requireAdmin(req, res, eventId);
    if (!event) return;

    const FolderModel = getFolderModel(eventId);
    const folder = await FolderModel.findOne({
      _id: folderId,
      eventId: new Types.ObjectId(eventId),
    });
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found' });
      return;
    }

    // Unset folderId on all photos in this folder
    const PhotoModel = getPhotoModel(eventId);
    await PhotoModel.updateMany(
      { folderId: new Types.ObjectId(folderId) },
      { $unset: { folderId: '' } }
    );

    await folder.deleteOne();
    res.status(200).json({ success: true, message: 'Folder deleted; photos moved to root' });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/photos/:photoId/folder?eventId=xxx  (admin only) ────────────────
export const assignPhotoToFolder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.query as { eventId: string };
    const { folderId } = req.body as { folderId: string };

    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId query param is required' });
      return;
    }

    const event = await requireAdmin(req, res, eventId);
    if (!event) return;

    // Verify folder belongs to the event
    const FolderModel = getFolderModel(eventId);
    const folder = await FolderModel.findOne({
      _id: folderId,
      eventId: new Types.ObjectId(eventId),
    });
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found in this event' });
      return;
    }

    const PhotoModel = getPhotoModel(eventId);
    const photo = await PhotoModel.findById(req.params.photoId);
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    photo.folderId = new Types.ObjectId(folderId);
    await photo.save();

    res.status(200).json({ success: true, photo });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/photos/:photoId/folder?eventId=xxx  (admin only) ──────────────
export const removePhotoFromFolder = async (
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

    const event = await requireAdmin(req, res, eventId);
    if (!event) return;

    const PhotoModel = getPhotoModel(eventId);
    const photo = await PhotoModel.findById(req.params.photoId);
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    photo.folderId = undefined;
    await photo.save();

    res.status(200).json({ success: true, photo });
  } catch (error) {
    next(error);
  }
};
