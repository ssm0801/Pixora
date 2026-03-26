# Deploying Pixora to Vercel

Pixora is a monorepo with a separate **frontend** (Next.js) and **backend** (Node/Express). Deploy each as its own Vercel project.

---

## Prerequisites

- Vercel account — [vercel.com](https://vercel.com)
- MongoDB Atlas cluster running, network access set to `0.0.0.0/0`
- Cloudinary account with API credentials
- Google OAuth app configured in Google Cloud Console

---

## 1. Deploy the Backend

The backend is a plain Node.js/Express app served as a serverless function via `vercel.json`.

### 1.1 Create `backend/vercel.json`

```json
{
  "version": 2,
  "builds": [{ "src": "src/server.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/server.ts" }]
}
```

### 1.2 Import backend on Vercel

1. Go to **vercel.com/new**
2. Import your repository
3. Set **Root Directory** to `backend`
4. Set **Framework Preset** to `Other`
5. Add the following **Environment Variables**:

| Key | Value |
|-----|-------|
| `MONGO_URI` | Your Atlas connection string |
| `JWT_SECRET` | A long random secret |
| `JWT_EXPIRES_IN` | `7d` |
| `SERVER_URL` | `https://your-backend.vercel.app` |
| `CLIENT_URL` | `https://your-frontend.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

6. Click **Deploy**
7. Note the deployment URL (e.g. `https://pixora-api.vercel.app`)

---

## 2. Deploy the Frontend

### 2.1 Import frontend on Vercel

1. Go to **vercel.com/new**
2. Import the same repository
3. Set **Root Directory** to `frontend`
4. Set **Framework Preset** to `Next.js`
5. Add the following **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://pixora-api.vercel.app/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-frontend.vercel.app` |

6. Click **Deploy**

---

## 3. Post-deployment steps

### 3.1 Update Google OAuth redirect URI

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → Credentials → your OAuth 2.0 Client**
3. Add to **Authorised redirect URIs**:
   ```
   https://pixora-api.vercel.app/api/auth/google/callback
   ```
4. Add to **Authorised JavaScript origins**:
   ```
   https://your-frontend.vercel.app
   ```

### 3.2 Update backend environment variables

In the backend Vercel project settings confirm:
- `SERVER_URL` → actual deployed backend URL
- `CLIENT_URL` → actual deployed frontend URL

### 3.3 Update frontend `NEXT_PUBLIC_API_URL`

In the frontend Vercel project settings set `NEXT_PUBLIC_API_URL` to `https://pixora-api.vercel.app/api`.

### 3.4 Redeploy both projects

After updating environment variables, trigger a redeploy of both projects from the Vercel dashboard.

---

## 4. Custom domain (optional)

1. In the Vercel dashboard, go to your project → **Settings → Domains**
2. Add your custom domain (e.g. `pixora.app` for frontend, `api.pixora.app` for backend)
3. Update `NEXT_PUBLIC_API_URL`, `SERVER_URL`, `CLIENT_URL`, and Google OAuth URIs accordingly

---

## Notes

- **Function timeout** — Vercel's free tier has a 10-second function timeout. Bulk permanent deletes (recycle bin purge) and large multi-upload batches may occasionally hit this. Upgrade to Pro or move heavy operations to a background queue for production.
- **Uploads** — Photos are streamed directly to Cloudinary, so Vercel bandwidth is not a bottleneck.
- **MongoDB** — Atlas free tier (M0) is sufficient for development. Use M10+ for production load.
- **Notifications** — The notification system uses MongoDB polling; no WebSocket infrastructure is required.
- **Analytics** — The `/analytics` endpoint performs aggregation queries on MongoDB. Ensure your Atlas cluster has adequate compute for large events.
