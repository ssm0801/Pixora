import { Router, Request, Response } from 'express';
import passport from 'passport';
import { register, login, getMe, updateProfile, changePassword, deleteAccount } from '../controllers/authController';
import { protect } from '../middlewares/auth';
import { generateToken } from '../utils/generateToken';
import { IUser } from '../models/User';

const router = Router();

// ── Email / Password ────────────────────────────────────────────────────────
router.post('/register', register as any);
router.post('/login', login as any);
router.get('/me', protect as any, getMe as any);
router.put('/profile', protect as any, updateProfile as any);
router.put('/password', protect as any, changePassword as any);
router.delete('/account', protect as any, deleteAccount as any);

// ── Google OAuth ────────────────────────────────────────────────────────────
// Step 1: redirect to Google consent screen
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google redirects here after user grants access
router.get('/google/callback', (req: Request, res: Response, next) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  passport.authenticate('google', { session: false }, (err: any, user: IUser | false) => {
    if (err) {
      const errorParam = err.code === 'ACCOUNT_DEACTIVATED' ? 'account_deactivated' : 'oauth_failed';
      return res.redirect(`${clientUrl}/login?error=${errorParam}`);
    }
    if (!user) {
      return res.redirect(`${clientUrl}/login?error=oauth_failed`);
    }
    const token = generateToken(user._id.toString());
    return res.redirect(`${clientUrl}/auth/callback?token=${token}`);
  })(req, res, next);
});

export default router;
