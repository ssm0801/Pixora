export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
}

export interface Event {
  _id: string;
  name: string;
  description?: string;
  adminId: User;
  members: User[];
  pendingInvites: User[];
  joinRequests: User[];
  code?: string;
  /** userId → 'all' | folderId[] — serialised from a Mongoose Map */
  memberFolderAccess?: Record<string, 'all' | string[]>;
  createdAt: string;
  updatedAt: string;
}

export interface EventInvite {
  _id: string;
  name: string;
  description?: string;
  adminId: User;
  createdAt: string;
}

export interface PhotoMetadata {
  capturedAt?: string;
  lat?: number;
  lng?: number;
  cameraMake?: string;
  cameraModel?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface Photo {
  _id: string;
  eventId: string;
  imageUrl: string;
  publicId: string;
  originalName: string;
  uploadedBy: { _id: string; name: string };
  metadata?: PhotoMetadata;
  mediaType?: 'photo' | 'video';
  isPublic: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  folderId?: string;
  createdAt: string;
}

export interface Folder {
  _id: string;
  eventId: string;
  name: string;
  createdBy: string;
  memberAccess: 'all' | string[];
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type NotificationType =
  | 'join_requested'
  | 'join_approved'
  | 'join_rejected'
  | 'invite_received'
  | 'invite_accepted'
  | 'invite_declined'
  | 'member_removed';

export interface Notification {
  _id: string;
  type: NotificationType;
  message: string;
  eventId?: string;
  eventName?: string;
  actorId?: string;
  read: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
