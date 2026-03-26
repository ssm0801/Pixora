import { Router } from 'express';
import {
  createFolder,
  listFolders,
  updateFolderAccess,
  deleteFolder,
} from '../controllers/folderController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect as any);

// All routes are scoped to /api/events/:eventId/folders
router.get('/:eventId/folders', listFolders as any);
router.post('/:eventId/folders', createFolder as any);
router.patch('/:eventId/folders/:folderId/access', updateFolderAccess as any);
router.delete('/:eventId/folders/:folderId', deleteFolder as any);

export default router;
