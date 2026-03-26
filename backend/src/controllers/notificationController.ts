import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Notification from '../models/Notification';

// GET /api/notifications
export const getMyNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notifications = await Notification.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(100);

    const unreadCount = notifications.filter((n) => !n.read).length;

    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/:id/read
export const markRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { read: true }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/read-all
export const markAllRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await Notification.updateMany({ userId: req.user!._id, read: false }, { read: true });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
