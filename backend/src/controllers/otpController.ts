import { Request, Response, NextFunction } from 'express';
import { createOtp, sendEmailOtp, sendPhoneOtp, verifyOtp } from '../utils/otpService';

// POST /api/otp/send
// Body: { identifier, type: 'email'|'phone', purpose }
// For 'delete-event' purpose, user must be authenticated
export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, type, purpose } = req.body as {
      identifier: string;
      type: 'email' | 'phone';
      purpose: 'register' | 'update-email' | 'update-phone' | 'delete-event' | 'delete-account';
    };

    if (!identifier || !type || !purpose) {
      res.status(400).json({ success: false, message: 'identifier, type, and purpose are required' });
      return;
    }

    const code = await createOtp(identifier.trim().toLowerCase(), type, purpose);

    if (type === 'email') {
      await sendEmailOtp(identifier.trim().toLowerCase(), code, purpose);
    } else {
      await sendPhoneOtp(identifier.trim(), code);
    }

    res.status(200).json({ success: true, message: `OTP sent to your ${type}` });
  } catch (error) {
    next(error);
  }
};

// POST /api/otp/verify
// Body: { identifier, type, purpose, code }
// Returns { success: true } — the actual protected action still happens in its own endpoint
export const verifyOtpEndpoint = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { identifier, type, purpose, code } = req.body as {
      identifier: string;
      type: 'email' | 'phone';
      purpose: string;
      code: string;
    };

    if (!identifier || !type || !purpose || !code) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    await verifyOtp(identifier.trim().toLowerCase(), type as any, purpose as any, code.trim());
    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
