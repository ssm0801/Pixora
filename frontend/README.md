# Pixora — Frontend

Next.js 15 (App Router) frontend for Pixora.

## Requirements

- Node.js 18+
- Backend API running (see `../backend/README.md`)
- Cloudinary account (cloud name needed for direct uploads)

## Setup

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL, e.g. `http://localhost:5001/api` |
| `NEXT_PUBLIC_SITE_URL` | This app's public URL, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name — enables direct browser uploads |

> `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is a public value (it appears in every Cloudinary URL). It is safe to expose in the browser.

## Running locally

```bash
npm install
npm run dev    # starts on http://localhost:3000
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page (logged out) or event dashboard (logged in) |
| `/login` | Email/password login + Google OAuth |
| `/register` | Create account (email OTP required) |
| `/create-event` | Create a new event (protected) |
| `/join` | Join an event by code or QR scan (protected) |
| `/event/[eventId]` | Event gallery — photos & videos, tile/list views, media filter, folders, favourites, multi-select (protected) |
| `/event/[eventId]/settings` | Event settings — edit info, members, invite QR, danger zone (protected) |
| `/event/[eventId]/analytics` | Event analytics — upload timeline, top uploaders, folder & camera breakdown (admin) |
| `/event/[eventId]/trash` | Recycle bin — restore or permanently delete soft-deleted items (admin) |
| `/notifications` | In-app notification centre (protected) |
| `/profile` | Edit profile, change password, delete account (protected) |
| `/about` | About page |
| `/pricing` | Pricing page |
| `/faqs` | FAQs |
| `/contact` | Contact page |
| `/privacy-policy` | Privacy policy |
| `/terms` | Terms of service |
| `/refunds` | Refund policy |
| `/auth/callback` | Google OAuth callback handler |

## Upload architecture

Media uploads bypass the backend server entirely:

1. Frontend requests a signed upload token from `POST /api/photos/sign-upload`
2. Browser uploads the file directly to `https://api.cloudinary.com/v1_1/{cloud}/auto/upload`
3. After the upload completes, frontend calls `POST /api/photos/save-direct` to persist the record

**Why this matters:**
- **Speed** — one network hop instead of two (no file buffering on the server)
- **Scale** — 5 files upload concurrently; selecting 10,000 files queues them automatically
- **No server memory pressure** — large videos never touch the Express process
- **Original quality** — no Cloudinary transformations are applied on upload

## Key libraries

| Library | Purpose |
|---------|---------|
| `next` 15 | App Router, server components |
| `tailwindcss` | Utility-first styling |
| `shadcn/ui` | Component primitives |
| `axios` | HTTP client (also used for direct Cloudinary upload) |
| `sonner` | Toast notifications |
| `react-qr-code` | QR code generation |
| `jszip` | Client-side bulk ZIP download |
| `next-themes` | Dark / light mode |
| `lucide-react` | Icons |
