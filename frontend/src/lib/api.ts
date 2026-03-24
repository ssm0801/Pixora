import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
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
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Events ──────────────────────────────────────────────────────────────────
export const eventApi = {
  list: () => api.get('/events'),
  create: (data: { name: string; description?: string }) =>
    api.post('/events', data),
  get: (id: string) => api.get(`/events/${id}`),
  invite: (eventId: string, email: string) =>
    api.post('/events/invite', { eventId, email }),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  getMyInvites: () => api.get('/events/my-invites'),
  acceptInvite: (id: string) => api.post(`/events/${id}/accept`),
  declineInvite: (id: string) => api.post(`/events/${id}/decline`),
  removeMember: (eventId: string, userId: string) =>
    api.delete(`/events/${eventId}/members/${userId}`),
  leave: (id: string) => api.post(`/events/${id}/leave`),
};

// ── Photos ──────────────────────────────────────────────────────────────────
export const photoApi = {
  list: (eventId: string) => api.get(`/photos?eventId=${eventId}`),
  upload: (eventId: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('eventId', eventId);
    form.append('photo', file);
    return api.post('/photos/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
  uploadMultiple: (
    eventId: string,
    files: File[],
    onProgress?: (pct: number) => void
  ) => {
    const form = new FormData();
    form.append('eventId', eventId);
    files.forEach((f) => form.append('photos', f));
    return api.post('/photos/upload-multiple', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
  delete: (photoId: string, eventId: string) =>
    api.delete(`/photos/${photoId}?eventId=${eventId}`),
};

export default api;
