import { Router } from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary';
import {
  uploadPhoto,
  uploadMultiplePhotos,
  getPhotos,
  deletePhoto,
} from '../controllers/photoController';
import { protect } from '../middlewares/auth';

const router = Router();
const upload = multer({ storage });

router.use(protect as any);

router.get('/', getPhotos as any);
router.post('/upload', upload.single('photo'), uploadPhoto as any);
router.post('/upload-multiple', upload.array('photos', 20), uploadMultiplePhotos as any);
router.delete('/:photoId', deletePhoto as any);

export default router;
