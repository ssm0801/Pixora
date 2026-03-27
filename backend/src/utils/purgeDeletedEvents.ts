import mongoose from 'mongoose';
import Event from '../models/Event';
import { purgeEventData } from '../controllers/eventController';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Hard-deletes any soft-deleted events whose deletedAt is older than 30 days.
 * Called at server startup and once every 24 h thereafter.
 */
export async function purgeExpiredDeletedEvents(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_MS);

  const expired = await Event.find(
    { isDeleted: true, deletedAt: { $lte: cutoff } },
    '_id'
  ).setOptions({ includeDeleted: true });

  if (!expired.length) return;

  console.log(`[purge] Hard-deleting ${expired.length} expired soft-deleted event(s)`);

  for (const event of expired) {
    const id = (event._id as mongoose.Types.ObjectId).toString();
    try {
      await purgeEventData(id);
      await Event.deleteOne({ _id: event._id }).setOptions({ includeDeleted: true });
      console.log(`[purge] Deleted event ${id}`);
    } catch (err) {
      console.error(`[purge] Failed to delete event ${id}:`, err);
    }
  }
}

/** Start the daily purge timer. Call once after DB connection is ready. */
export function schedulePurge(): void {
  purgeExpiredDeletedEvents().catch(console.error);
  setInterval(() => purgeExpiredDeletedEvents().catch(console.error), 24 * 60 * 60 * 1000);
}
