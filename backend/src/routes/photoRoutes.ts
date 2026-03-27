import { Router } from 'express';
import {
  getPhotos,
  deletePhoto,
  getTrash,
  restorePhoto,
  permanentDeletePhoto,
  toggleVisibility,
  toggleFavorite,
  getFavorites,
} from '../controllers/photoController';
import {
  assignPhotoToFolder,
  removePhotoFromFolder,
} from '../controllers/folderController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect as any);

// ── Photo listing & favorites (no :photoId — must come before /:photoId routes)
router.get('/favorites', getFavorites as any);
router.get('/trash', getTrash as any);
router.get('/', getPhotos as any);

// ── Per-photo actions
router.delete('/:photoId/permanent', permanentDeletePhoto as any);
router.post('/:photoId/restore', restorePhoto as any);
router.patch('/:photoId/visibility', toggleVisibility as any);
router.post('/:photoId/favorite', toggleFavorite as any);
router.post('/:photoId/folder', assignPhotoToFolder as any);
router.delete('/:photoId/folder', removePhotoFromFolder as any);
router.delete('/:photoId', deletePhoto as any);

export default router;
