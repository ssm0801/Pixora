import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import Event from '../models/Event';
import User from '../models/User';
import { getPhotoModel } from '../models/Photo';
import { cloudinary } from '../config/cloudinary';

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
      .populate('pendingInvites', 'name email');

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
    const { eventId, email } = req.body as { eventId: string; email: string };
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
    await event.save();

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
    await event.save();

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
    await event.save();

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
    await event.save();

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
    await event.save();

    res.status(200).json({ success: true, message: 'You have left the event' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id  (admin only)
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

    const eventId = event._id.toString();
    const PhotoModel = getPhotoModel(eventId);

    const photos = await PhotoModel.find({}, 'publicId');
    const publicIds = photos.map((p) => p.publicId);
    for (let i = 0; i < publicIds.length; i += 100) {
      const batch = publicIds.slice(i, i + 100);
      if (batch.length > 0) {
        await cloudinary.api.delete_resources(batch);
      }
    }

    const db = mongoose.connection.db;
    if (db) {
      const collectionName = `photos_${eventId}`;
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length > 0) {
        await db.dropCollection(collectionName);
      }
    }

    await event.deleteOne();

    res.status(200).json({ success: true, message: 'Event and all photos deleted' });
  } catch (error) {
    next(error);
  }
};
