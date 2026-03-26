import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// Extend Express Request to carry the authenticated user
export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized — no token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.isActive === false) {
      res.status(403).json({ success: false, message: 'Account deactivated' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
