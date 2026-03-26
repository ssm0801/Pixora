import Notification, { NotificationType } from '../models/Notification';
import { Types } from 'mongoose';

export async function notify(
  userId: string | Types.ObjectId,
  type: NotificationType,
  message: string,
  eventId?: string | Types.ObjectId,
  eventName?: string,
  actorId?: string | Types.ObjectId
): Promise<void> {
  try {
    await Notification.create({ userId, type, message, eventId, eventName, actorId });
  } catch {
    // Non-critical — never let a notification failure break the main response
  }
}
