# Pixora — AWS Infrastructure (CDK)

Python CDK project managing all AWS resources for Pixora's media pipeline.

## Architecture

```
Browser
  │
  │  1. POST /api/media/presign  (get signed S3 URL from backend)
  ▼
Backend (Express)
  │  returns: { url, key }  or  { uploadId, key, parts[] }
  │
  │  2. PUT directly to S3 (single file <10 MB, or multipart chunks in parallel)
  ▼
S3 Bucket  (ap-south-1 — Mumbai; no Transfer Acceleration needed)
  │   eventId/media/{uuid}.ext      ← originals
  │
  │  3. S3 ObjectCreated event triggers Lambda
  ▼
Lambda (ThumbnailGenerator — Python 3.12 + Pillow)
  │  Images: Pillow LANCZOS crop → 400×400 JPEG
  │  Videos: FFmpeg first frame (optional layer) → Pillow resize → JPEG
  │  Writes eventId/thumbnail/{uuid}.jpg
  ▼
S3 Bucket
  │   eventId/thumbnail/{uuid}.jpg  ← thumbnails
  │
  │  CloudFront reads both paths via OAC
  ▼
CloudFront CDN — PRICE_CLASS_200 (Mumbai, Singapore, Europe, N. America)
  │
  ▼
Browser (tile view loads thumbnail ~30 KB, modal loads original)
```

## Stacks

| Stack | Resources |
|-------|-----------|
| `PixoraStorage` | S3 bucket, CORS, lifecycle tiering, IAM user + access key |
| `PixoraCdn` | CloudFront distribution, OAC, two cache behaviours (media + thumbnails) |
| `PixoraThumbnails` | Python Lambda, optional FFmpeg layer, S3 event trigger |

---

## Prerequisites

```bash
npm install -g aws-cdk
aws configure
# Enter: Access Key ID, Secret, region = ap-south-1, output = json
```

Get your AWS account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

Also required: Python 3.10+ and Docker (CDK uses Docker to bundle the Lambda package).

---

## Setup Python env (once)

```bash
cd infra
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## Bootstrap CDK (once per account/region)

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-south-1
```

---

## Deploy

```bash
# All stacks at once
cdk deploy --all

# Or individually — Storage must go first
cdk deploy PixoraStorage
cdk deploy PixoraCdn
cdk deploy PixoraThumbnails
```

### Optional context flags

| Flag | Default | Effect |
|------|---------|--------|
| `transfer_acceleration=true` | off | Enables S3 Transfer Acceleration (+$0.04/GB). Only useful if bucket is **not** in `ap-south-1`. |
| `ffmpeg_layer=true` | off | Attaches FFmpeg Lambda layer for video first-frame thumbnails. Without it, videos get a grey placeholder. |

```bash
# Enable video thumbnails
cdk deploy PixoraThumbnails --context ffmpeg_layer=true
```

---

## Outputs after deploy

```
PixoraStorage.BucketName          = pixorastorage-pixoramediaXXXXX
PixoraStorage.BucketRegion        = ap-south-1
PixoraStorage.BackendAccessKeyId  = AKIAXXXXXXXXXXXXXXXX
PixoraStorage.BackendSecretKey    = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PixoraCdn.CdnUrl                  = https://dXXXXXXXXXXXX.cloudfront.net
```

---

## Add keys to .env files

### backend/.env

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<BackendAccessKeyId output>
AWS_SECRET_ACCESS_KEY=<BackendSecretKey output>
S3_BUCKET_NAME=<BucketName output>
CLOUDFRONT_URL=<CdnUrl output>
```

### frontend/.env.local

```env
NEXT_PUBLIC_CLOUDFRONT_URL=<CdnUrl output>
```

---

## Verify

```bash
# Check S3 structure after an upload
aws s3 ls s3://YOUR_BUCKET_NAME --recursive

# Expected:
# eventId/media/uuid.jpg        ← original
# eventId/thumbnail/uuid.jpg    ← Lambda-generated thumbnail
```

---

## Redeploy after code changes

```bash
# Lambda code changed
cdk deploy PixoraThumbnails

# S3 / IAM changes
cdk deploy PixoraStorage
```

---

## Destroy

```bash
cdk destroy --all
```

> **Note:** The S3 bucket has `RemovalPolicy.RETAIN` — it is **not** deleted when the stack is destroyed. Empty and delete it manually from the AWS Console if needed.

---

## Cost breakdown (ap-south-1, typical early-stage usage)

### S3 storage tiers

| Tier | Triggered after | Price per GB/month | Savings vs Standard |
|------|-----------------|--------------------|---------------------|
| S3 Standard | Day 0 | $0.025 | — |
| S3 Standard-IA | Day 30 | $0.0138 | ~45 % |
| Glacier Instant Retrieval | Day 180 | $0.005 | ~80 % |

Old wedding albums (> 6 months) cost practically nothing to store.

### Monthly estimate (10 GB stored, 50 k requests, 5 GB delivered)

| Service | Cost |
|---------|------|
| S3 Standard storage (first 30 days) | ~$0.25 |
| S3 Standard-IA (30–180 days) | ~$0.14 |
| S3 PUT/GET requests | ~$0.05 |
| CloudFront delivery (PRICE_CLASS_200) | ~$0.05/GB = ~$0.25 |
| Lambda (thumbnails, free tier) | $0.00 — 1 M invocations free |
| **Total** | **< $1/month** for typical early-stage usage |

### Cost optimisations applied

| Change | Before | After | Saving |
|--------|--------|-------|--------|
| Transfer Acceleration | Always on (+$0.04/GB) | Off (opt-in only) | ~$0.40/10 GB uploaded |
| CloudFront price class | `PRICE_CLASS_ALL` | `PRICE_CLASS_200` | ~15–20 % on delivery |
| Lambda memory | 1 024 MB | 512 MB | ~50 % on compute |
| Lambda timeout | 60 s | 30 s | reduces max cost per invocation |
| Concurrency cap | unlimited | 5 | prevents spike billing on bulk uploads |
| Lambda runtime | Node.js + Sharp layer | Python 3.12 + Pillow | no paid layer |
| S3 lifecycle | none | Standard-IA → Glacier | 45–80 % on old media |
