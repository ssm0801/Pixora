import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Event from '../models/Event';
import { generateToken } from '../utils/generateToken';

interface AuthRequest extends Request {
  user?: any;
}

// POST /api/auth/register
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, email, password } = req.body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    };

    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    const pwdErrors: string[] = [];
    if (password.length < 8)            pwdErrors.push('at least 8 characters');
    if (!/[A-Z]/.test(password))        pwdErrors.push('one uppercase letter');
    if (!/[a-z]/.test(password))        pwdErrors.push('one lowercase letter');
    if (!/[0-9]/.test(password))        pwdErrors.push('one number');
    if (!/[^A-Za-z0-9]/.test(password)) pwdErrors.push('one special character');
    if (pwdErrors.length > 0) {
      res.status(400).json({ success: false, message: `Password must contain: ${pwdErrors.join(', ')}.` });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.isActive === false) {
        res.status(403).json({
          success: false,
          code: 'ACCOUNT_DEACTIVATED',
          message: 'This email is associated with a deactivated account. Please contact our support team to resolve this.',
        });
        return;
      }
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const user = await User.create({ firstName, lastName, email, password });
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      token,
      user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }
    if (user.isActive === false) {
      res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'This account has been deactivated. Please contact our support team to resolve this.',
      });
      return;
    }
    if (!(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      token,
      user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/profile
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user._id;
    const { firstName, lastName, phone, email } = req.body as {
      firstName?: string; lastName?: string; phone?: string; email?: string;
    };

    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    if (firstName?.trim()) user.firstName = firstName.trim();
    if (lastName?.trim()) user.lastName = lastName.trim();
    if (phone !== undefined) {
      const trimmed = phone.trim();
      if (trimmed) {
        const phoneExists = await User.findOne({ phone: trimmed, _id: { $ne: userId } });
        if (phoneExists) {
          if (phoneExists.isActive === false) {
            res.status(403).json({
              success: false,
              code: 'ACCOUNT_DEACTIVATED',
              message: 'This phone number is associated with a deactivated account. Please contact our support team to resolve this.',
            });
            return;
          }
          res.status(409).json({ success: false, message: 'Phone number already in use' });
          return;
        }
      }
      user.phone = trimmed;
    }
    if (email?.trim()) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existing) {
        if (existing.isActive === false) {
          res.status(403).json({
            success: false,
            code: 'ACCOUNT_DEACTIVATED',
            message: 'This email is associated with a deactivated account. Please contact our support team to resolve this.',
          });
          return;
        }
        res.status(409).json({ success: false, message: 'Email already in use' });
        return;
      }
      user.email = email.toLowerCase().trim();
    }

    await user.save(); // triggers pre-save hook to update `name`

    res.status(200).json({
      success: true,
      user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/password
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Both passwords are required' });
      return;
    }
    const pwdErrors: string[] = [];
    if (newPassword.length < 8)            pwdErrors.push('at least 8 characters');
    if (!/[A-Z]/.test(newPassword))        pwdErrors.push('one uppercase letter');
    if (!/[a-z]/.test(newPassword))        pwdErrors.push('one lowercase letter');
    if (!/[0-9]/.test(newPassword))        pwdErrors.push('one number');
    if (!/[^A-Za-z0-9]/.test(newPassword)) pwdErrors.push('one special character');
    if (pwdErrors.length > 0) {
      res.status(400).json({ success: false, message: `Password must contain: ${pwdErrors.join(', ')}.` });
      return;
    }

    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    if (!user.password) {
      res.status(400).json({ success: false, message: 'Google accounts cannot use password login' });
      return;
    }

    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/auth/account
export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user._id;

    // Remove user from all events they're a member of (but don't admin)
    await Event.updateMany(
      { members: userId, adminId: { $ne: userId } },
      { $pull: { members: userId, pendingInvites: userId, joinRequests: userId } }
    );

    // Delete events this user admins
    await Event.deleteMany({ adminId: userId });

    // Soft-delete: mark inactive, clear personal/auth data, preserve email+phone as tombstones
    await User.findByIdAndUpdate(userId, {
      $set: {
        isActive: false,
        deletedAt: new Date(),
        firstName: 'Deleted',
        lastName: 'User',
        name: 'Deleted User',
      },
      $unset: { password: '', googleId: '', avatar: '' },
    });

    res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
};
