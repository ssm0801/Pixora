import { Router } from 'express';
import { getEventAnalytics } from '../controllers/analyticsController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect as any);

// GET /api/events/:eventId/analytics
router.get('/:eventId/analytics', getEventAnalytics as any);

export default router;
