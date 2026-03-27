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
| `OTP_SECRET` | Long random secret for HMAC OTP generation |
| `SERVER_URL` | This server's base URL, e.g. `http://localhost:5001` |
| `CLIENT_URL` | Frontend URL — used for OAuth redirects and CORS |
| `FRONTEND_URL` | Frontend URL — used for invite links (usually same as `CLIENT_URL`) |
| `PORT` | Port to listen on (default `5001`) |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `SMTP_HOST` | SMTP server host, e.g. `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port, e.g. `587` |
| `SMTP_USER` | SMTP username / email address |
| `SMTP_PASS` | SMTP password or app password |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (for SMS OTPs and invite SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio number to send from |

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
| POST | `/api/auth/register` | — | Register with email & password (email OTP required) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/auth/check` | — | Check email/phone availability before OTP |
| GET | `/api/auth/me` | JWT | Get current user |
| PUT | `/api/auth/profile` | JWT | Update name / phone / email (OTP required for contact changes) |
| PUT | `/api/auth/password` | JWT | Change password (email OTP + history check) |
| DELETE | `/api/auth/account` | JWT | Delete account (email OTP required) |
| GET | `/api/auth/google` | — | Google OAuth start |
| GET | `/api/auth/google/callback` | — | Google OAuth callback |

### OTP — `/api/otp`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/otp/send` | — | Send OTP via email or SMS |
| POST | `/api/otp/verify` | — | Verify OTP (stateless HMAC check) |

### Events — `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events` | JWT | List events I'm part of |
| POST | `/api/events` | JWT | Create a new event |
| GET | `/api/events/my-invites` | JWT | Pending email invites |
| POST | `/api/events/invite` | JWT | Invite a user by email (sends SMS/email with join link) |
| POST | `/api/events/join` | JWT | Join event by code |
| GET | `/api/events/:id` | JWT | Get event details |
| PATCH | `/api/events/:id` | JWT | Update event (admin) |
| DELETE | `/api/events/:id` | JWT | Delete event (admin, OTP required) |
| POST | `/api/events/:id/accept` | JWT | Accept email invite |
| POST | `/api/events/:id/decline` | JWT | Decline email invite |
| DELETE | `/api/events/:id/members/:userId` | JWT | Remove member (admin) |
| PATCH | `/api/events/:id/members/:userId/access` | JWT | Update member folder access (admin) |
| POST | `/api/events/:id/leave` | JWT | Leave event |
| POST | `/api/events/:id/join-requests/:userId/approve` | JWT | Approve join request (admin) |
| DELETE | `/api/events/:id/join-requests/:userId` | JWT | Reject join request (admin) |

### Photos & Videos — `/api/photos`

Media is stored at original quality — no compression applied.

**Recommended upload flow (fast, any scale):**

1. `POST /api/photos/sign-upload` → get a signed upload token
2. Browser uploads directly to `https://api.cloudinary.com/v1_1/{cloud}/auto/upload`
3. `POST /api/photos/save-direct` → save the record in the database

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/photos/sign-upload` | JWT (admin) | Get signed Cloudinary upload params for direct browser upload |
| POST | `/api/photos/save-direct` | JWT (admin) | Save record after direct Cloudinary upload |
| GET | `/api/photos` | JWT | List photos & videos (`?eventId=`) |
| GET | `/api/photos/favorites` | JWT | Get favourited items (`?eventId=`) |
| GET | `/api/photos/trash` | JWT | Get trashed items (`?eventId=`, admin) |
| POST | `/api/photos/upload` | JWT (admin) | Upload single file via server (legacy) |
| POST | `/api/photos/upload-multiple` | JWT (admin) | Upload up to 50 files via server (legacy) |
| DELETE | `/api/photos/:photoId` | JWT (admin) | Soft-delete (move to recycle bin) |
| POST | `/api/photos/:photoId/restore` | JWT (admin) | Restore from recycle bin |
| DELETE | `/api/photos/:photoId/permanent` | JWT (admin) | Permanently delete |
| PATCH | `/api/photos/:photoId/visibility` | JWT (admin) | Toggle public/private |
| POST | `/api/photos/:photoId/favorite` | JWT | Toggle favourite |
| POST | `/api/photos/:photoId/folder` | JWT (admin) | Assign to folder |
| DELETE | `/api/photos/:photoId/folder` | JWT (admin) | Remove from folder |

### Folders — `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events/:eventId/folders` | JWT | List folders for event |
| POST | `/api/events/:eventId/folders` | JWT (admin) | Create folder |
| PATCH | `/api/events/:eventId/folders/:folderId/access` | JWT (admin) | Update folder member access |
| DELETE | `/api/events/:eventId/folders/:folderId` | JWT (admin) | Delete folder |

### Analytics — `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events/:eventId/analytics` | JWT (admin) | Get event analytics |

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
