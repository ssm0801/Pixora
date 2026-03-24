import { Router, Request, Response } from 'express';
import passport from 'passport';
import { register, login, getMe } from '../controllers/authController';
import { protect } from '../middlewares/auth';
import { generateToken } from '../utils/generateToken';
import { IUser } from '../models/User';

const router = Router();

// ── Email / Password ────────────────────────────────────────────────────────
router.post('/register', register as any);
router.post('/login', login as any);
router.get('/me', protect as any, getMe as any);

// ── Google OAuth ────────────────────────────────────────────────────────────
// Step 1: redirect to Google consent screen
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google redirects here after user grants access
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as IUser;
    const token = generateToken(user._id.toString());
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/auth/callback?token=${token}`);
  }
);

export default router;
