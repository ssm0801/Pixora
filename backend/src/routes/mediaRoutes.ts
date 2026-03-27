import { Router } from 'express';
import {
  presignUpload,
  presignMultipart,
  completeMultipart,
  saveMedia,
} from '../controllers/mediaController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect as any);

// Single file (< 10 MB) — get a presigned PUT URL
router.post('/presign',            presignUpload    as any);

// Large file (≥ 10 MB) — initiate multipart + get per-part presigned URLs
router.post('/presign-multipart',  presignMultipart as any);

// Complete multipart after all parts are uploaded
router.post('/complete-multipart', completeMultipart as any);

// Persist the media record in MongoDB after upload
router.post('/save',               saveMedia        as any);

export default router;
