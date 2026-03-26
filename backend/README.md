# Pixora — Backend

Express + TypeScript REST API for Pixora.

## Requirements

- Node.js 18+
- MongoDB Atlas account
- Cloudinary account
- Google Cloud Console project (for OAuth)

## Setup

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `SERVER_URL` | This server's base URL, e.g. `http://localhost:5001` |
| `CLIENT_URL` | Frontend URL, e.g. `http://localhost:3000` |
| `PORT` | Port to listen on (default `5001`) |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

## Running locally

```bash
npm install
npm run dev    # ts-node-dev with hot reload
```

Server starts at `http://localhost:5001`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development with hot reload |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled output |

## API routes

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register with email & password |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| PUT | `/api/auth/profile` | JWT | Update name / avatar |
| PUT | `/api/auth/password` | JWT | Change password |
| DELETE | `/api/auth/account` | JWT | Delete account |
| GET | `/api/auth/google` | — | Google OAuth start |
| GET | `/api/auth/google/callback` | — | Google OAuth callback |

### Events — `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events` | JWT | List events I'm part of |
| POST | `/api/events` | JWT | Create a new event |
| GET | `/api/events/my-invites` | JWT | Pending email invites |
| POST | `/api/events/invite` | JWT | Invite a user by email |
| POST | `/api/events/join` | JWT | Join event by code |
| GET | `/api/events/:id` | JWT | Get event details |
| PATCH | `/api/events/:id` | JWT | Update event (admin) |
| DELETE | `/api/events/:id` | JWT | Delete event (admin) |
| POST | `/api/events/:id/accept` | JWT | Accept email invite |
| POST | `/api/events/:id/decline` | JWT | Decline email invite |
| DELETE | `/api/events/:id/members/:userId` | JWT | Remove member (admin) |
| PATCH | `/api/events/:id/members/:userId/access` | JWT | Update member folder access (admin) |
| POST | `/api/events/:id/leave` | JWT | Leave event |
| POST | `/api/events/:id/join-requests/:userId/approve` | JWT | Approve join request (admin) |
| DELETE | `/api/events/:id/join-requests/:userId` | JWT | Reject join request (admin) |

### Photos — `/api/photos`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/photos` | JWT | List photos (`?eventId=`) |
| GET | `/api/photos/favorites` | JWT | Get favourited photos (`?eventId=`) |
| GET | `/api/photos/trash` | JWT | Get trashed photos (`?eventId=`, admin) |
| POST | `/api/photos/upload` | JWT | Upload single photo |
| POST | `/api/photos/upload-multiple` | JWT | Upload up to 20 photos |
| DELETE | `/api/photos/:photoId` | JWT | Soft-delete (move to recycle bin) |
| POST | `/api/photos/:photoId/restore` | JWT | Restore from recycle bin (admin) |
| DELETE | `/api/photos/:photoId/permanent` | JWT | Permanently delete (admin) |
| PATCH | `/api/photos/:photoId/visibility` | JWT | Toggle public/private |
| POST | `/api/photos/:photoId/favorite` | JWT | Toggle favourite |
| POST | `/api/photos/:photoId/folder` | JWT | Assign photo to folder |
| DELETE | `/api/photos/:photoId/folder` | JWT | Remove photo from folder |

### Folders — `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events/:eventId/folders` | JWT | List folders for event |
| POST | `/api/events/:eventId/folders` | JWT | Create folder (admin) |
| PATCH | `/api/events/:eventId/folders/:folderId/access` | JWT | Update folder member access (admin) |
| DELETE | `/api/events/:eventId/folders/:folderId` | JWT | Delete folder (admin) |

### Analytics — `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events/:eventId/analytics` | JWT | Get event analytics (admin) |

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | JWT | Get my notifications |
| PATCH | `/api/notifications/read-all` | JWT | Mark all as read |
| PATCH | `/api/notifications/:id/read` | JWT | Mark one as read |

## Google OAuth setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Credentials → Create OAuth 2.0 Client**
3. Application type: **Web application**
4. Add authorised redirect URI: `http://localhost:5001/api/auth/google/callback`
5. Copy Client ID and Client Secret to `.env`
