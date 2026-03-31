import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import Event from '../models/Event';
import User from '../models/User';
import { getPhotoModel } from '../models/Photo';
import { deleteFromS3 } from './mediaController';
import { notify } from '../utils/notify';
import { verifyOtp, sendInviteLink } from '../utils/otpService';
import { Types } from 'mongoose';

/** Normalise a raw access value. Folder IDs are stored as plain strings to avoid
 *  Mongoose Map + Mixed serialisation issues with ObjectId arrays. */
function normaliseAccess(raw?: 'all' | string[]): 'all' | string[] {
  if (!raw || raw === 'all') return 'all';
  if (Array.isArray(raw)) return raw.map((id) => id.toString());
  return 'all';
}

// POST /api/events
export const createEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const adminId = req.user!._id;

    if (!name) {
      res.status(400).json({ success: false, message: 'Event name is required' });
      return;
    }

    const event = await Event.create({
      name,
      description,
      adminId,
      members: [adminId],
      pendingInvites: [],
    });

    res.status(201).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/events/:id — update name/description (admin only)
export const updateEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the admin can edit this event' });
      return;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ success: false, message: 'Event name cannot be empty' });
        return;
      }
      event.name = name.trim();
    }
    if (description !== undefined) event.description = description.trim() || undefined;

    await event.save();
    res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/:id
export const getEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('adminId', 'name email')
      .populate('members', 'name email')
      .populate('pendingInvites', 'name email')
      .populate('joinRequests', 'name email');

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const userId = req.user!._id.toString();
    const isMember = event.members.some((m: any) => m._id.toString() === userId);

    if (!isMember) {
      res.status(403).json({ success: false, message: 'Access denied — not a member' });
      return;
    }

    // Lazily generate a join code for events created before the code field was added
    if (!event.code) {
      event.code = require('crypto').randomBytes(4).toString('hex').toUpperCase();
      await event.save();
    }

    res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

// GET /api/events — list events the user belongs to
export const listMyEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const events = await Event.find({ members: userId })
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/my-invites — pending invites for the current user
export const getMyInvites = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const events = await Event.find({ pendingInvites: userId })
      .populate('adminId', 'name email')
      .select('name description adminId createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, invites: events });
  } catch (error) {
    next(error);
  }
};

// POST /api/events/invite — queue an invite (admin only)
export const inviteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId, email, access } = req.body as {
      eventId: string;
      email: string;
      access?: 'all' | string[];
    };
    const adminId = req.user!._id.toString();

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.adminId.toString() !== adminId) {
      res.status(403).json({ success: false, message: 'Only the admin can invite users' });
      return;
    }

    const invitee = await User.findOne({ email });
    if (!invitee) {
      res.status(404).json({ success: false, message: 'No user found with that email' });
      return;
    }

    const inviteeId = invitee._id.toString();

    const alreadyMember = event.members.some((m) => m.toString() === inviteeId);
    if (alreadyMember) {
      res.status(409).json({ success: false, message: 'User is already a member' });
      return;
    }

    const alreadyInvited = event.pendingInvites.some((m) => m.toString() === inviteeId);
    if (alreadyInvited) {
      res.status(409).json({ success: false, message: 'User already has a pending invite' });
      return;
    }

    event.pendingInvites.push(invitee._id as any);

    // Store the intended folder access for when the user accepts
    const resolvedAccess = normaliseAccess(access);
    event.pendingInviteAccess.set(inviteeId, resolvedAccess);
    event.markModified('pendingInviteAccess');

    await event.save();

    // Notify the invited user (in-app)
    await notify(
      invitee._id,
      'invite_received',
      `You were invited to join "${event.name}"`,
      event._id,
      event.name
    );

    // Send SMS (if phone) or email with the join link — non-blocking
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const joinUrl = `${frontendUrl}/join?code=${event.code}`;
    sendInviteLink({
      email: invitee.email,
      phone: invitee.phone || undefined,
      inviterName: req.user!.name,
      eventName: event.name,
      joinUrl,
    }).catch((err) => console.error('[invite] Failed to send invite link:', err));

    res.status(200).json({
      success: true,
      message: `Invite sent to ${invitee.name}`,
      user: { _id: invitee._id, name: invitee.name, email: invitee.email },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/events/:id/accept — accept a pending invite
export const acceptInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const isPending = event.pendingInvites.some((m) => m.toString() === userId);
    if (!isPending) {
      res.status(400).json({ success: false, message: 'No pending invite found' });
      return;
    }

    event.pendingInvites = event.pendingInvites.filter((m) => m.toString() !== userId) as any;
    event.members.push(req.user!._id as any);

    // Promote pending access → active member access (default 'all' if not pre-set)
    const grantedAccess = event.pendingInviteAccess.get(userId) ?? 'all';
    event.memberFolderAccess.set(userId, grantedAccess);
    event.pendingInviteAccess.delete(userId);
    event.markModified('memberFolderAccess');
    event.markModified('pendingInviteAccess');

    await event.save();

    // Notify admin
    await notify(
      event.adminId,
      'invite_accepted',
      `${req.user!.name} accepted your invite to "${event.name}"`,
      event._id,
      event.name
    );

    res.status(200).json({ success: true, message: 'Invite accepted' });
  } catch (error) {
    next(error);
  }
};

// POST /api/events/:id/decline — decline a pending invite
export const declineInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const isPending = event.pendingInvites.some((m) => m.toString() === userId);
    if (!isPending) {
      res.status(400).json({ success: false, message: 'No pending invite found' });
      return;
    }

    event.pendingInvites = event.pendingInvites.filter((m) => m.toString() !== userId) as any;
    event.pendingInviteAccess.delete(userId);
    event.markModified('pendingInviteAccess');
    await event.save();

    // Notify admin
    await notify(
      event.adminId,
      'invite_declined',
      `${req.user!.name} declined your invite to "${event.name}"`,
      event._id,
      event.name
    );

    res.status(200).json({ success: true, message: 'Invite declined' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id/members/:userId — admin removes a member
export const removeMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user!._id.toString();
    const { id: eventId, userId: targetUserId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.adminId.toString() !== adminId) {
      res.status(403).json({ success: false, message: 'Only the admin can remove members' });
      return;
    }

    if (targetUserId === adminId) {
      res.status(400).json({ success: false, message: 'Admin cannot remove themselves' });
      return;
    }

    const wasMember = event.members.some((m) => m.toString() === targetUserId);
    if (!wasMember) {
      res.status(404).json({ success: false, message: 'User is not a member' });
      return;
    }

    event.members = event.members.filter((m) => m.toString() !== targetUserId) as any;
    event.memberFolderAccess.delete(targetUserId);
    event.markModified('memberFolderAccess');
    await event.save();

    // Notify removed user
    await notify(
      targetUserId,
      'member_removed',
      `You were removed from "${event.name}"`,
      event._id,
      event.name
    );

    res.status(200).json({ success: true, message: 'Member removed' });
  } catch (error) {
    next(error);
  }
};

// POST /api/events/:id/leave — non-admin member leaves event
export const leaveEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.adminId.toString() === userId) {
      res.status(400).json({ success: false, message: 'Admin cannot leave — delete the event instead' });
      return;
    }

    const isMember = event.members.some((m) => m.toString() === userId);
    if (!isMember) {
      res.status(400).json({ success: false, message: 'You are not a member of this event' });
      return;
    }

    event.members = event.members.filter((m) => m.toString() !== userId) as any;
    event.memberFolderAccess.delete(userId);
    event.markModified('memberFolderAccess');
    await event.save();

    res.status(200).json({ success: true, message: 'You have left the event' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id  (admin only) — soft delete: suspends access, retains data 30 days
export const deleteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the admin can delete this event' });
      return;
    }

    event.isDeleted = true;
    event.deletedAt = new Date();
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event soft-deleted. All data will be permanently removed after 30 days.',
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id/permanent  (admin only) — hard delete: immediately wipes all S3 data + DB
export const hardDeleteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Allow finding soft-deleted events for hard delete
    const event = await Event.findOne({ _id: req.params.id }).setOptions({ includeDeleted: true });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the admin can delete this event' });
      return;
    }

    await purgeEventData(event._id.toString());
    await event.deleteOne();

    res.status(200).json({ success: true, message: 'Event and all data permanently deleted' });
  } catch (error) {
    next(error);
  }
};

/** Shared helper: wipe all S3 objects + per-event collections for a given eventId */
export async function purgeEventData(eventId: string): Promise<void> {
  const PhotoModel = getPhotoModel(eventId);
  const photos = await PhotoModel.find({}, 'publicId');
  await Promise.all(photos.map((p) => deleteFromS3(p.publicId)));

  const db = mongoose.connection.db;
  if (db) {
    for (const col of [`photos_${eventId}`, `folders_${eventId}`, `favorites_${eventId}`]) {
      const exists = await db.listCollections({ name: col }).toArray();
      if (exists.length > 0) await db.dropCollection(col);
    }
  }
}

// POST /api/events/join — request to join via event code (queued for admin approval)
export const joinByCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.body as { code: string };
    const userId = req.user!._id.toString();

    if (!code?.trim()) {
      res.status(400).json({ success: false, message: 'Event code is required' });
      return;
    }

    const event = await Event.findOne({ code: code.trim().toUpperCase() });

    if (!event) {
      res.status(404).json({ success: false, message: 'No event found with that code' });
      return;
    }

    const alreadyMember = event.members.some((m) => m.toString() === userId);
    if (alreadyMember) {
      res.status(409).json({ success: false, message: 'You are already a member of this event' });
      return;
    }

    const alreadyInvited = event.pendingInvites.some((u) => u.toString() === userId);
    if (alreadyInvited) {
      res.status(409).json({ success: false, message: 'You already have a pending invite. Check your invites on the home page.' });
      return;
    }

    const alreadyRequested = (event.joinRequests || []).some((u) => u.toString() === userId);
    if (alreadyRequested) {
      res.status(409).json({ success: false, message: 'Your join request is already pending — the admin will review it soon.' });
      return;
    }

    event.joinRequests = event.joinRequests || [] as any;
    event.joinRequests.push(userId as any);
    await event.save();

    // Notify admin
    await notify(
      event.adminId,
      'join_requested',
      `${req.user!.name} requested to join "${event.name}"`,
      event._id,
      event.name,
      userId
    );

    res.status(200).json({ success: true, message: `Join request sent for "${event.name}". The admin will review it.` });
  } catch (error) {
    next(error);
  }
};

// POST /api/events/:id/join-requests/:userId/approve — admin approves a join request
export const approveJoinRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ success: false, message: 'Event not found' }); return; }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the admin can approve join requests' }); return;
    }

    const { access } = req.body as { access?: 'all' | string[] };
    const targetId = req.params.userId;
    const inRequests = (event.joinRequests || []).some((u) => u.toString() === targetId);
    if (!inRequests) { res.status(404).json({ success: false, message: 'Join request not found' }); return; }

    event.joinRequests = (event.joinRequests || []).filter((u) => u.toString() !== targetId) as any;
    event.members.push(targetId as any);

    event.memberFolderAccess.set(targetId, normaliseAccess(access));
    event.markModified('memberFolderAccess');

    await event.save();

    // Notify approved user
    await notify(
      targetId,
      'join_approved',
      `Your request to join "${event.name}" was approved`,
      event._id,
      event.name
    );

    res.status(200).json({ success: true, message: 'User approved and added to event' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id/join-requests/:userId — admin rejects a join request
export const rejectJoinRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ success: false, message: 'Event not found' }); return; }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the admin can reject join requests' }); return;
    }

    const targetId = req.params.userId;
    event.joinRequests = (event.joinRequests || []).filter((u) => u.toString() !== targetId) as any;
    await event.save();

    // Notify rejected user
    await notify(
      targetId,
      'join_rejected',
      `Your request to join "${event.name}" was not approved`,
      event._id,
      event.name
    );

    res.status(200).json({ success: true, message: 'Join request rejected' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/events/:id/members/:userId/access — admin updates a member's folder access
export const updateMemberAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: eventId, userId: targetUserId } = req.params;
    const { access } = req.body as { access: 'all' | string[] };

    const event = await Event.findById(eventId);
    if (!event) { res.status(404).json({ success: false, message: 'Event not found' }); return; }
    if (event.adminId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Admin access required' }); return;
    }

    const isMember = event.members.some((m) => m.toString() === targetUserId);
    if (!isMember) { res.status(404).json({ success: false, message: 'User is not a member' }); return; }

    event.memberFolderAccess.set(targetUserId, normaliseAccess(access));
    event.markModified('memberFolderAccess');
    await event.save();

    res.status(200).json({ success: true, message: 'Member access updated' });
  } catch (error) {
    next(error);
  }
};
