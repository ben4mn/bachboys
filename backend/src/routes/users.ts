import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query, queryOne } from '../db/pool.js';
import { validate, updateProfileSchema, tripStatusSchema } from '../utils/validators.js';
import { AppError } from '../middleware/errorHandler.js';
import type { User, PublicUser } from '../types/index.js';

const router = Router();

function toPublicUser(user: User): PublicUser {
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
    trip_status: user.trip_status,
  };
}

// GET /api/users - List all attendees
router.get('/', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await query<User>(
      `SELECT id, username, display_name, bio, photo_url, phone, venmo_handle,
              is_admin, is_groom, trip_status, created_at
       FROM users
       ORDER BY display_name`
    );

    res.json({ users: users.map(toPublicUser) });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Get user profile
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await queryOne<User>(
      `SELECT id, username, display_name, bio, photo_url, phone, venmo_handle,
              is_admin, is_groom, trip_status, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id - Update own profile
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Can only update own profile (unless admin)
    if (req.user!.userId !== req.params.id && !req.user!.isAdmin) {
      throw new AppError('Not authorized', 403);
    }

    const data = validate(updateProfileSchema, req.body);

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(data.display_name);
    }
    if (data.bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(data.bio);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.venmo_handle !== undefined) {
      updates.push(`venmo_handle = $${paramIndex++}`);
      values.push(data.venmo_handle);
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const [user] = await query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/trip-status - Update trip RSVP status
router.put('/:id/trip-status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Can only update own status (unless admin)
    if (req.user!.userId !== req.params.id && !req.user!.isAdmin) {
      throw new AppError('Not authorized', 403);
    }

    const { status } = validate(tripStatusSchema, req.body);

    const [user] = await query<User>(
      `UPDATE users SET trip_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
