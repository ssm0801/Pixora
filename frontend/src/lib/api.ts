import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pixora_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global auth error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('pixora_token');
      localStorage.removeItem('pixora_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; email?: string }) =>
    api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data),
  deleteAccount: () => api.delete('/auth/account'),
};

// ── Events ──────────────────────────────────────────────────────────────────
export const eventApi = {
  list: () => api.get('/events'),
  create: (data: { name: string; description?: string }) =>
    api.post('/events', data),
  get: (id: string) => api.get(`/events/${id}`),
  invite: (eventId: string, email: string, access: 'all' | string[] = 'all') =>
    api.post('/events/invite', { eventId, email, access }),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/events/${id}`, data),
  /** Soft delete — suspends access, data retained 30 days then auto-purged */
  delete: (id: string) => api.delete(`/events/${id}`),
  /** Hard delete — immediately wipes all S3 data and the event record */
  hardDelete: (id: string) => api.delete(`/events/${id}/permanent`),
  getMyInvites: () => api.get('/events/my-invites'),
  acceptInvite: (id: string) => api.post(`/events/${id}/accept`),
  declineInvite: (id: string) => api.post(`/events/${id}/decline`),
  removeMember: (eventId: string, userId: string) =>
    api.delete(`/events/${eventId}/members/${userId}`),
  leave: (id: string) => api.post(`/events/${id}/leave`),
  joinByCode: (code: string) => api.post('/events/join', { code }),
  approveJoinRequest: (eventId: string, userId: string, access: 'all' | string[] = 'all') =>
    api.post(`/events/${eventId}/join-requests/${userId}/approve`, { access }),
  updateMemberAccess: (eventId: string, userId: string, access: 'all' | string[]) =>
    api.patch(`/events/${eventId}/members/${userId}/access`, { access }),
  rejectJoinRequest: (eventId: string, userId: string) =>
    api.delete(`/events/${eventId}/join-requests/${userId}`),
};

// ── Media (S3 direct upload) ─────────────────────────────────────────────────
export const mediaApi = {
  presign: (eventId: string, data: { fileName: string; contentType: string }) =>
    api.post('/media/presign', { eventId, ...data }),
  presignMultipart: (
    eventId: string,
    data: { fileName: string; contentType: string; fileSize: number }
  ) => api.post('/media/presign-multipart', { eventId, ...data }),
  completeMultipart: (data: {
    uploadId: string;
    key: string;
    parts: { ETag: string; PartNumber: number }[];
  }) => api.post('/media/complete-multipart', data),
  save: (data: {
    eventId: string;
    key: string;
    originalName: string;
    fileSize?: number;
    resourceType?: string;
    width?: number;
    height?: number;
  }) => api.post('/media/save', data),
};

// ── Photos ──────────────────────────────────────────────────────────────────
export const photoApi = {
  list: (eventId: string) => api.get(`/photos?eventId=${eventId}`),
  delete: (photoId: string, eventId: string) =>
    api.delete(`/photos/${photoId}?eventId=${eventId}`),
  toggleVisibility: (photoId: string, eventId: string) =>
    api.patch(`/photos/${photoId}/visibility?eventId=${eventId}`),
  toggleFavorite: (photoId: string, eventId: string) =>
    api.post(`/photos/${photoId}/favorite?eventId=${eventId}`),
  getFavorites: (eventId: string) =>
    api.get(`/photos/favorites?eventId=${eventId}`),
  getTrash: (eventId: string) =>
    api.get(`/photos/trash?eventId=${eventId}`),
  restorePhoto: (photoId: string, eventId: string) =>
    api.post(`/photos/${photoId}/restore?eventId=${eventId}`),
  permanentDelete: (photoId: string, eventId: string) =>
    api.delete(`/photos/${photoId}/permanent?eventId=${eventId}`),
};

// ── Folders ──────────────────────────────────────────────────────────────────
export const folderApi = {
  list: (eventId: string) =>
    api.get(`/events/${eventId}/folders`),
  create: (eventId: string, name: string) =>
    api.post(`/events/${eventId}/folders`, { name }),
  updateAccess: (eventId: string, folderId: string, memberAccess: 'all' | string[]) =>
    api.patch(`/events/${eventId}/folders/${folderId}/access`, { memberAccess }),
  delete: (eventId: string, folderId: string) =>
    api.delete(`/events/${eventId}/folders/${folderId}`),
  assignPhoto: (photoId: string, eventId: string, folderId: string) =>
    api.post(`/photos/${photoId}/folder?eventId=${eventId}`, { folderId }),
  removePhoto: (photoId: string, eventId: string) =>
    api.delete(`/photos/${photoId}/folder?eventId=${eventId}`),
};

// ── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getEvent: (eventId: string) =>
    api.get(`/events/${eventId}/analytics`),
};

// ── Notifications ────────────────────────────────────────────────────────────
export const notificationApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export default api;
