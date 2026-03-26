import { Router } from 'express';
import {
  createEvent,
  getEvent,
  updateEvent,
  listMyEvents,
  getMyInvites,
  inviteUser,
  acceptInvite,
  declineInvite,
  removeMember,
  leaveEvent,
  deleteEvent,
  joinByCode,
  approveJoinRequest,
  rejectJoinRequest,
  updateMemberAccess,
} from '../controllers/eventController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect as any);

router.get('/', listMyEvents as any);
router.post('/', createEvent as any);
router.get('/my-invites', getMyInvites as any);
router.post('/invite', inviteUser as any);
router.post('/join', joinByCode as any);
router.get('/:id', getEvent as any);
router.patch('/:id', updateEvent as any);
router.delete('/:id', deleteEvent as any);
router.post('/:id/accept', acceptInvite as any);
router.post('/:id/decline', declineInvite as any);
router.delete('/:id/members/:userId', removeMember as any);
router.patch('/:id/members/:userId/access', updateMemberAccess as any);
router.post('/:id/leave', leaveEvent as any);
router.post('/:id/join-requests/:userId/approve', approveJoinRequest as any);
router.delete('/:id/join-requests/:userId', rejectJoinRequest as any);

export default router;
