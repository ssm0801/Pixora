import { Router } from 'express';
import { sendOtp, verifyOtpEndpoint } from '../controllers/otpController';

const router = Router();

router.post('/send', sendOtp as any);
router.post('/verify', verifyOtpEndpoint as any);

export default router;
