import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getPhotoModel } from '../models/Photo';
import { getFolderModel } from '../models/Folder';
import { getFavoriteModel } from '../models/Favorite';
import Event from '../models/Event';
import { Types } from 'mongoose';

// ── GET /api/events/:eventId/analytics  (admin only) ─────────────────────────
export const getEventAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;

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

    // ── Summary counts ─────────────────────────────────────────────────────────
    const totalPhotos  = await PhotoModel.countDocuments({ isDeleted: false });
    const publicCount  = await PhotoModel.countDocuments({ isDeleted: false, isPublic: true });
    const privateCount = await PhotoModel.countDocuments({ isDeleted: false, isPublic: false });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trashCount = await PhotoModel.countDocuments({
      isDeleted: true,
      deletedAt: { $gte: twentyFourHoursAgo },
    });

    // ── Uploads per day (last 30 days) ─────────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const uploadTimeline = await PhotoModel.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Top uploaders ──────────────────────────────────────────────────────────
    const topUploaders = await PhotoModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$uploadedBy',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          name: { $arrayElemAt: ['$user.name', 0] },
        },
      },
    ]);

    // ── Metadata coverage ──────────────────────────────────────────────────────
    const withCapturedAt = await PhotoModel.countDocuments({
      isDeleted: false,
      'metadata.capturedAt': { $exists: true, $ne: null },
    });

    const withGps = await PhotoModel.countDocuments({
      isDeleted: false,
      'metadata.lat': { $exists: true, $ne: null },
      'metadata.lng': { $exists: true, $ne: null },
    });

    const capturedAtCoverage = totalPhotos > 0
      ? Math.round((withCapturedAt / totalPhotos) * 100)
      : 0;
    const gpsCoverage = totalPhotos > 0
      ? Math.round((withGps / totalPhotos) * 100)
      : 0;

    // ── Oldest / newest captured dates ─────────────────────────────────────────
    const oldestPhoto = await PhotoModel.findOne({
      isDeleted: false,
      'metadata.capturedAt': { $exists: true, $ne: null },
    }).sort({ 'metadata.capturedAt': 1 }).select('metadata.capturedAt originalName');

    const newestPhoto = await PhotoModel.findOne({
      isDeleted: false,
      'metadata.capturedAt': { $exists: true, $ne: null },
    }).sort({ 'metadata.capturedAt': -1 }).select('metadata.capturedAt originalName');

    // ── Folder stats ──────────────────────────────────────────────────────────
    const FolderModel = getFolderModel(eventId);
    const folders = await FolderModel.find({ eventId: new Types.ObjectId(eventId) }).lean();
    const folderCount = folders.length;

    // Photos per folder
    const photosPerFolder = await PhotoModel.aggregate([
      { $match: { isDeleted: false, folderId: { $exists: true, $ne: null } } },
      { $group: { _id: '$folderId', count: { $sum: 1 } } },
    ]);
    const folderPhotoMap: Record<string, number> = {};
    for (const row of photosPerFolder) folderPhotoMap[row._id.toString()] = row.count;

    const folderBreakdown = folders.map((f) => ({
      _id: (f._id as Types.ObjectId).toString(),
      name: f.name,
      count: folderPhotoMap[(f._id as Types.ObjectId).toString()] ?? 0,
    }));

    // Photos with no folder
    const unfolderedCount = await PhotoModel.countDocuments({
      isDeleted: false,
      folderId: { $exists: false },
    });

    // ── Favorites ─────────────────────────────────────────────────────────────
    const FavoriteModel = getFavoriteModel(eventId);
    const totalFavorites = await FavoriteModel.countDocuments({ eventId: new Types.ObjectId(eventId) });

    // Uploads today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const uploadsToday = await PhotoModel.countDocuments({
      isDeleted: false,
      createdAt: { $gte: startOfToday },
    });

    // Average file size (bytes)
    const sizeAgg = await PhotoModel.aggregate([
      { $match: { isDeleted: false, 'metadata.fileSize': { $exists: true, $ne: null } } },
      { $group: { _id: null, total: { $sum: '$metadata.fileSize' }, count: { $sum: 1 } } },
    ]);
    const totalSizeBytes: number = sizeAgg[0]?.total ?? 0;

    // ── Camera breakdown ───────────────────────────────────────────────────────
    const cameraBreakdown = await PhotoModel.aggregate([
      {
        $match: {
          isDeleted: false,
          'metadata.cameraMake': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            make: '$metadata.cameraMake',
            model: '$metadata.cameraModel',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        summary: {
          totalPhotos,
          publicCount,
          privateCount,
          trashCount,
          memberCount: event.members.length,
          folderCount,
          totalFavorites,
          uploadsToday,
          totalSizeBytes,
          unfolderedCount,
        },
        uploadTimeline,
        topUploaders,
        folderBreakdown,
        metadataCoverage: {
          capturedAt: capturedAtCoverage,
          gps: gpsCoverage,
          withCapturedAt,
          withGps,
          total: totalPhotos,
        },
        capturedDateRange: {
          oldest: oldestPhoto?.metadata?.capturedAt ?? null,
          newest: newestPhoto?.metadata?.capturedAt ?? null,
        },
        cameraBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
