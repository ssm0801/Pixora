import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'join_requested'     // admin receives: user X wants to join your event
  | 'join_approved'      // user receives: your request to join was approved
  | 'join_rejected'      // user receives: your request to join was rejected
  | 'invite_received'    // user receives: you were invited to event
  | 'invite_accepted'    // admin receives: user accepted your invite
  | 'invite_declined'    // admin receives: user declined your invite
  | 'member_removed';    // user receives: you were removed from event

export interface INotification extends Document {
  userId: Types.ObjectId;   // recipient
  type: NotificationType;
  message: string;
  eventId?: Types.ObjectId;
  eventName?: string;
  actorId?: Types.ObjectId; // the user who triggered the notification (e.g. requester for join_requested)
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:      { type: String, required: true },
    message:   { type: String, required: true },
    eventId:   { type: Schema.Types.ObjectId, ref: 'Event' },
    eventName: { type: String },
    actorId:   { type: Schema.Types.ObjectId, ref: 'User' },
    read:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
