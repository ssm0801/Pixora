# Pixora — Private Event Photo Sharing

Pixora lets you create private photo albums for events, invite guests by email or QR code, organise photos into folders, and share memories only with the people who were there.

## Features

- **Private events** — invite-only albums, join by email invite or event code/QR
- **Photo management** — upload, favourite, bulk download as ZIP, tile & list views
- **Folders** — organise photos into named folders with per-member access control
- **Recycle bin** — soft-delete with 24-hour auto-purge; restore or permanently delete
- **Analytics** — upload timeline, top uploaders, folder breakdown, camera metadata
- **Notifications** — in-app notifications for invites, join requests, and approvals
- **Settings** — edit event details, manage members, generate invite QR codes
- **Dark / light mode** — via `next-themes`

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui |
| Backend | Node.js · Express · TypeScript · MongoDB (Atlas) |
| Storage | Cloudinary |
| Auth | JWT + Google OAuth (Passport.js) |
| Zip download | JSZip (client-side) |
| QR codes | react-qr-code |

## Repository structure

```
pixora/
├── frontend/     # Next.js 15 App Router app
└── backend/      # Express REST API
```

## Quick start

### 1. Clone

```bash
git clone https://github.com/your-username/pixora.git
cd pixora
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # starts on http://localhost:5001
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # fill in your values
npm install
npm run dev                         # starts on http://localhost:3000
```

See [backend/README.md](./backend/README.md) and [frontend/README.md](./frontend/README.md) for detailed setup and full API reference.

## Deployment

See [VERCEL.md](./VERCEL.md) for step-by-step Vercel deployment instructions.
