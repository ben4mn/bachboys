import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService.js';
import { authenticate } from '../middleware/auth.js';
import {
  validate,
  registerSchema,
  loginSchema,
  verifyNameSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../utils/validators.js';
import type { PublicUser } from '../types/index.js';

const router = Router();

// Helper to convert User to PublicUser (remove sensitive fields)
function toPublicUser(user: {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  phone: string | null;
  venmo_handle: string | null;
  is_admin: boolean;
  is_groom: boolean;
  trip_status: string;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    photo_url: user.photo_url,
    phone: user.phone,
    venmo_handle: user.venmo_handle,
    is_admin: user.is_admin,
    is_groom: user.is_groom,
    trip_status: user.trip_status as PublicUser['trip_status'],
  };
}

// POST /api/auth/verify-name
router.post('/verify-name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { real_name } = validate(verifyNameSchema, req.body);
    const result = await authService.verifyName(real_name);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(registerSchema, req.body);
    const { user, accessToken, refreshToken } = await authService.register(data);

    res.status(201).json({
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = validate(loginSchema, req.body);
    const { user, accessToken, refreshToken } = await authService.login(username, password);

    res.json({
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = validate(forgotPasswordSchema, req.body);
    await authService.forgotPassword(email);
    res.json({ message: 'If that email is registered, you will receive a reset link.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = validate(resetPasswordSchema, req.body);
    await authService.resetPassword(token, password);
    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ status: 'error', message: 'Refresh token required' });
      return;
    }

    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getUser(req.user!.userId);
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
