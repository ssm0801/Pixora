/**
 * Media Controller — S3-backed upload pipeline
 * ─────────────────────────────────────────────
 * Replaces the Cloudinary sign-upload / save-direct flow with a faster
 * S3 presigned-URL approach that supports:
 *
 *  • Transfer Acceleration  — uploads via nearest AWS edge PoP
 *  • Multipart upload       — files ≥ 10 MB are split into 10 MB chunks
 *                             and uploaded in parallel from the browser
 *
 * Flow (small file < 10 MB):
 *   1. POST /api/media/presign          → { url, key }
 *   2. Browser PUT url ← file
 *   3. POST /api/media/save             → { photo }
 *
 * Flow (large file ≥ 10 MB):
 *   1. POST /api/media/presign-multipart → { uploadId, key, parts[] }
 *   2. Browser PUT each part.url ← chunk (parallel)
 *   3. POST /api/media/complete-multipart
 *   4. POST /api/media/save             → { photo }
 */

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Response, NextFunction } from 'express';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthRequest } from '../middlewares/auth';
import { getPhotoModel } from '../models/Photo';
import Event from '../models/Event';

// ── S3 client (Transfer Acceleration enabled) ─────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  useAccelerateEndpoint: true,   // routes uploads via nearest AWS edge PoP
  ...(process.env.AWS_ACCESS_KEY_ID
    ? {
        credentials: {
          accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      }
    : {}), // falls back to IAM role when running on EC2/ECS/Lambda
});

const BUCKET        = process.env.S3_BUCKET_NAME!;
const CLOUDFRONT    = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
const CHUNK_SIZE    = 10 * 1024 * 1024; // 10 MB — S3 minimum part size is 5 MB
const URL_EXPIRES   = 3600;             // presigned URL validity: 1 hour

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireAdmin(req: AuthRequest, res: Response, eventId: string) {
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, message: 'Event not found' });
    return null;
  }
  if (event.adminId.toString() !== req.user!._id.toString()) {
    res.status(403).json({ success: false, message: 'Only the admin can upload media' });
    return null;
  }
  return event;
}

function buildKey(eventId: string, fileName: string): string {
  const ext = path.extname(fileName).toLowerCase() || '';
  return `${eventId}/media/${uuidv4()}${ext}`;
}

// ── POST /api/media/presign ───────────────────────────────────────────────────
// Single presigned PUT URL for files < 10 MB
export const presignUpload = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId, fileName, contentType } = req.body as {
      eventId: string;
      fileName: string;
      contentType: string;
    };

    const event = await requireAdmin(req, res, eventId);
    if (!event) return;

    const key = buildKey(eventId, fileName);

    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: URL_EXPIRES }
    );

    res.status(200).json({ success: true, url, key });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/media/presign-multipart ────────────────────────────────────────
// Initiates a multipart upload and returns a presigned URL for each part.
// Each part is 10 MB; the last part may be smaller.
export const presignMultipart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId, fileName, contentType, fileSize } = req.body as {
      eventId: string;
      fileName: string;
      contentType: string;
      fileSize: number;
    };

    const event = await requireAdmin(req, res, eventId);
    if (!event) return;

    const key       = buildKey(eventId, fileName);
    const partCount = Math.ceil(fileSize / CHUNK_SIZE);

    // Initiate the multipart upload — S3 returns an UploadId
    const { UploadId } = await s3.send(
      new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
    );

    // Generate one presigned URL per part (all in parallel)
    const parts = await Promise.all(
      Array.from({ length: partCount }, async (_, i) => {
        const url = await getSignedUrl(
          s3,
          new UploadPartCommand({
            Bucket:     BUCKET,
            Key:        key,
            UploadId:   UploadId!,
            PartNumber: i + 1,
          }),
          { expiresIn: URL_EXPIRES }
        );
        return { partNumber: i + 1, url };
      })
    );

    res.status(200).json({ success: true, uploadId: UploadId, key, parts });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/media/complete-multipart ───────────────────────────────────────
// Merges all uploaded parts into the final S3 object.
// Call this after all part PUTs succeed.
export const completeMultipart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key, uploadId, parts } = req.body as {
      key:      string;
      uploadId: string;
      parts:    { ETag: string; PartNumber: number }[];
    };

    // Basic key validation — must follow {eventId}/media/{file} structure
    if (!/^[^/]+\/media\/.+/.test(key)) {
      res.status(400).json({ success: false, message: 'Invalid key' });
      return;
    }

    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket:   BUCKET,
        Key:      key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
            .sort((a, b) => a.PartNumber - b.PartNumber)
            .map((p) => ({ ETag: p.ETag, PartNumber: p.PartNumber })),
        },
      })
    );

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/media/save ──────────────────────────────────────────────────────
// Persists a media record in MongoDB after the S3 upload completes.
export const saveMedia = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId, key, originalName, fileSize, resourceType, width, height } =
      req.body as {
        eventId:      string;
        key:          string;
        originalName: string;
        fileSize?:    number;
        resourceType?: string; // 'video' | 'image'
        width?:       number;
        height?:      number;
      };

    const event = await requireAdmin(req, res, eventId);
    if (!event) return;

    // Verify the key belongs to this event's media folder
    if (!key.startsWith(`${eventId}/media/`)) {
      res.status(400).json({ success: false, message: 'Invalid upload key' });
      return;
    }

    const imageUrl = `${CLOUDFRONT}/${key}`;
    const isVideo  = resourceType === 'video';

    const PhotoModel = getPhotoModel(eventId);
    const photo = await PhotoModel.create({
      imageUrl,
      publicId:     key,       // S3 key — used for deletion
      originalName,
      uploadedBy:   req.user!._id,
      metadata:     { fileSize, width, height },
      mediaType:    isVideo ? 'video' : 'photo',
      isPublic:     false,
    });

    res.status(201).json({ success: true, photo });
  } catch (error) {
    next(error);
  }
};

// ── Exported helper: delete S3 object + its thumbnail ────────────────────────
// Used by permanentDeletePhoto to clean up S3 when a media record is removed.
export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));

    // Also remove the Lambda-generated thumbnail: {eventId}/media/uuid.ext → {eventId}/thumbnail/uuid.jpg
    const thumbKey = key.replace('/media/', '/thumbnail/').replace(/\.[^.]+$/, '.jpg');
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: thumbKey }));
  } catch (err) {
    // Log but don't throw — a missing S3 object should not block DB cleanup
    console.error('[media] S3 delete error:', err);
  }
}
