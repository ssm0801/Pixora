export interface User {
  _id: string;
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

export interface Photo {
  _id: string;
  eventId: string;
  imageUrl: string;
  publicId: string;
  originalName: string;
  uploadedBy: { _id: string; name: string };
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
