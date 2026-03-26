import { Router } from 'express';
import { getMyNotifications, markRead, markAllRead } from '../controllers/notificationController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect as any);

router.get('/', getMyNotifications as any);
router.patch('/read-all', markAllRead as any);
router.patch('/:id/read', markRead as any);

export default router;
