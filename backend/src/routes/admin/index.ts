import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { query, queryOne } from '../../db/pool.js';
import { validate, eventSchema, costSplitSchema } from '../../utils/validators.js';
import { hashPassword } from '../../utils/crypto.js';
import { AppError } from '../../middleware/errorHandler.js';
import { pushService } from '../../services/PushService.js';
import { recalculateEventCosts } from '../../utils/recalculateCosts.js';
import type { Event, User, Payment, EventCost, UserBalance } from '../../types/index.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/dashboard - Get admin dashboard stats
router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user stats
    const [userStats] = await query<{ total: number; confirmed: number }>(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN trip_status = 'confirmed' THEN 1 END) as confirmed
       FROM users`
    );

    // Get event count
    const [eventStats] = await query<{ total: number; upcoming: number }>(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN start_time > NOW() THEN 1 END) as upcoming
       FROM events`
    );

    // Get payment stats
    const [paymentStats] = await query<{ total_collected: number; pending_count: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as total_collected,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
       FROM payments`
    );

    // Get total owed
    const [totalOwed] = await query<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM event_costs`
    );

    res.json({
      users: {
        total: Number(userStats?.total || 0),
        confirmed: Number(userStats?.confirmed || 0),
      },
      events: {
        total: Number(eventStats?.total || 0),
        upcoming: Number(eventStats?.upcoming || 0),
      },
      payments: {
        total_collected: Number(paymentStats?.total_collected || 0),
        pending_count: Number(paymentStats?.pending_count || 0),
        total_owed: Number(totalOwed?.total || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== EVENT MANAGEMENT =====

// POST /api/admin/events - Create new event
router.post('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(eventSchema, req.body);

    const [event] = await query<Event>(
      `INSERT INTO events (title, description, location, location_url, event_url, start_time, end_time,
                           is_mandatory, total_cost, split_type, exclude_groom, category, image_url, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        data.title,
        data.description || null,
        data.location || null,
        data.location_url || null,
        data.event_url || null,
        data.start_time,
        data.end_time || null,
        data.is_mandatory,
        data.total_cost,
        data.split_type,
        data.exclude_groom ?? true,
        data.category || null,
        data.image_url || null,
        data.notes || null,
        req.user!.userId,
      ]
    );

    // Auto-calculate costs for even/fixed-split events
    if (event.split_type !== 'custom' && Number(event.total_cost) > 0) {
      recalculateEventCosts(event.id).catch(() => {});
    }

    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/events/:id - Update event
router.put('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(eventSchema, req.body);

    const [event] = await query<Event>(
      `UPDATE events SET
         title = $1, description = $2, location = $3, location_url = $4, event_url = $5,
         start_time = $6, end_time = $7, is_mandatory = $8, total_cost = $9,
         split_type = $10, exclude_groom = $11, category = $12, image_url = $13, notes = $14, updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        data.title,
        data.description || null,
        data.location || null,
        data.location_url || null,
        data.event_url || null,
        data.start_time,
        data.end_time || null,
        data.is_mandatory,
        data.total_cost,
        data.split_type,
        data.exclude_groom ?? true,
        data.category || null,
        data.image_url || null,
        data.notes || null,
        req.params.id,
      ]
    );

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Auto-recalculate costs if event cost or split changed
    if (event.split_type !== 'custom' && Number(event.total_cost) > 0) {
      recalculateEventCosts(event.id).catch(() => {});
    }

    res.json({ event });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/events/:id - Delete event
router.delete('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `DELETE FROM events WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (result.length === 0) {
      throw new AppError('Event not found', 404);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/events/:id/costs - Set custom costs for event
router.put('/events/:id/costs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { costs } = validate(costSplitSchema, req.body);

    // Delete existing costs
    await query(`DELETE FROM event_costs WHERE event_id = $1`, [req.params.id]);

    // Insert new costs
    for (const cost of costs) {
      await query(
        `INSERT INTO event_costs (event_id, user_id, amount, notes)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, cost.user_id, cost.amount, cost.notes || null]
      );
    }

    const updatedCosts = await query<EventCost>(
      `SELECT * FROM event_costs WHERE event_id = $1`,
      [req.params.id]
    );

    res.json({ costs: updatedCosts });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/events/:id/costs/calculate - Auto-calculate even split
router.post('/events/:id/costs/calculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await queryOne<Event>(
      `SELECT * FROM events WHERE id = $1`,
      [req.params.id]
    );

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Get paying attendees (exclude groom if needed)
    const payingAttendees = event.exclude_groom
      ? await query<User>(`SELECT * FROM users WHERE trip_status = 'confirmed' AND is_groom = false`)
      : await query<User>(`SELECT * FROM users WHERE trip_status = 'confirmed'`);

    if (payingAttendees.length === 0) {
      throw new AppError('No confirmed attendees to split costs', 400);
    }

    const totalCost = Number(event.total_cost);
    let perPersonCost: number;
    let note: string;

    if (event.split_type === 'fixed') {
      // totalCost is the per-person rate
      if (event.exclude_groom) {
        const allAttendees = await query<User>(`SELECT * FROM users WHERE trip_status = 'confirmed'`);
        perPersonCost = (totalCost * allAttendees.length) / payingAttendees.length;
        note = `$${totalCost.toFixed(0)}/person (covers groom)`;
      } else {
        perPersonCost = totalCost;
        note = `$${totalCost.toFixed(0)}/person`;
      }
    } else {
      // even split
      perPersonCost = totalCost / payingAttendees.length;
      note = event.exclude_groom
        ? `$${totalCost.toFixed(0)} ÷ ${payingAttendees.length} guests (covers groom)`
        : `Even split`;
    }

    // Delete existing costs
    await query(`DELETE FROM event_costs WHERE event_id = $1`, [req.params.id]);

    // Insert costs for paying attendees
    for (const attendee of payingAttendees) {
      await query(
        `INSERT INTO event_costs (event_id, user_id, amount, notes)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, attendee.id, perPersonCost, note]
      );
    }

    // If excluding groom, add groom's $0 entry
    if (event.exclude_groom) {
      const groom = await queryOne<User>(`SELECT * FROM users WHERE is_groom = true`);
      if (groom) {
        await query(
          `INSERT INTO event_costs (event_id, user_id, amount, notes)
           VALUES ($1, $2, 0, $3)`,
          [req.params.id, groom.id, 'Groom — covered by the crew']
        );
      }
    }

    const updatedCosts = await query<EventCost & { display_name: string }>(
      `SELECT ec.*, u.display_name
       FROM event_costs ec
       JOIN users u ON ec.user_id = u.id
       WHERE ec.event_id = $1`,
      [req.params.id]
    );

    res.json({ costs: updatedCosts });
  } catch (error) {
    next(error);
  }
});

// ===== USER MANAGEMENT =====

// POST /api/admin/users - Add new attendee
router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, display_name, password } = req.body;

    if (!username || !email || !display_name || !password) {
      throw new AppError('Missing required fields', 400);
    }

    const passwordHash = await hashPassword(password);

    const [user] = await query<User>(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [username, email, passwordHash, display_name]
    );

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id - Remove attendee
router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prevent deleting yourself
    if (req.user!.userId === req.params.id) {
      throw new AppError('Cannot delete yourself', 400);
    }

    const result = await query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (result.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/reset-password - Reset a user's password
router.put('/users/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const passwordHash = await hashPassword(password);
    const [user] = await query<User>(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, display_name`,
      [passwordHash, req.params.id]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ status: 'ok', message: `Password reset for ${user.display_name}` });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/admin - Toggle admin status
router.put('/users/:id/admin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { is_admin } = req.body;

    // Prevent removing own admin status
    if (req.user!.userId === req.params.id && !is_admin) {
      throw new AppError('Cannot remove your own admin status', 400);
    }

    const [user] = await query<User>(
      `UPDATE users SET is_admin = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [is_admin, req.params.id]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/groom - Set groom status
router.put('/users/:id/groom', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { is_groom } = req.body;

    // If setting someone as groom, unset any existing groom
    if (is_groom) {
      await query(`UPDATE users SET is_groom = false WHERE is_groom = true`);
    }

    const [user] = await query<User>(
      `UPDATE users SET is_groom = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [is_groom, req.params.id]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// ===== PAYMENT MANAGEMENT =====

// GET /api/admin/payments - List all payments
router.get('/payments', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await query<Payment & { user_display_name: string; event_title?: string }>(
      `SELECT p.*, u.display_name as user_display_name, e.title as event_title
       FROM payments p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN events e ON p.event_id = e.id
       ORDER BY p.created_at DESC`
    );

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/balances - Get all user balances
router.get('/balances', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const balances = await query<UserBalance>(`SELECT * FROM user_balances ORDER BY display_name`);

    res.json({
      balances: balances.map(b => ({
        ...b,
        total_owed: Number(b.total_owed),
        total_paid: Number(b.total_paid),
        balance_remaining: Number(b.balance_remaining),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/payments/:id - Confirm/reject payment
router.put('/payments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'rejected'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const updates = status === 'confirmed'
      ? 'status = $1, confirmed_by = $2, confirmed_at = NOW(), updated_at = NOW()'
      : 'status = $1, updated_at = NOW()';

    const params = status === 'confirmed'
      ? [status, req.user!.userId, req.params.id]
      : [status, req.params.id];

    const [payment] = await query<Payment>(
      `UPDATE payments SET ${updates} WHERE id = $${status === 'confirmed' ? 3 : 2} RETURNING *`,
      params
    );

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    res.json({ payment });
  } catch (error) {
    next(error);
  }
});

// ===== NOTIFICATION MANAGEMENT =====

// POST /api/admin/notifications/send - Send notification to users
router.post('/notifications/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, body, type, target, eventId } = req.body;

    if (!title || !body) {
      throw new AppError('Title and body are required', 400);
    }

    const payload = {
      title,
      body,
      data: {
        type: type || 'general',
        url: eventId ? `/events/${eventId}` : '/schedule',
        eventId,
      },
    };

    let result: { sent: number; failed: number };

    switch (target) {
      case 'all':
        result = await pushService.sendToAll(payload);
        break;
      case 'event':
        if (!eventId) {
          throw new AppError('Event ID required for event target', 400);
        }
        result = await pushService.sendToEventAttendees(eventId, payload, true);
        break;
      default:
        result = await pushService.sendToAll(payload);
    }

    // Log notification
    await query(
      `INSERT INTO notifications (title, body, type, target_type, target_event_id, sent_at, sent_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [title, body, type || 'general', target || 'all', eventId || null, req.user!.userId]
    );

    res.json({
      status: 'ok',
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/notifications - Get notification history
router.get('/notifications', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await query(
      `SELECT n.*, u.display_name as sent_by_name, e.title as event_title
       FROM notifications n
       LEFT JOIN users u ON n.sent_by = u.id
       LEFT JOIN events e ON n.target_event_id = e.id
       ORDER BY n.created_at DESC
       LIMIT 50`
    );

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

// ===== GUEST LIST =====

// GET /api/admin/guest-list/unclaimed - Get guests who haven't registered
router.get('/guest-list/unclaimed', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const unclaimed = await query<{ id: string; full_name: string }>(
      `SELECT id, full_name FROM guest_list WHERE claimed_by IS NULL ORDER BY full_name`
    );

    res.json({ unclaimed });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/notifications/stats - Get push subscription stats
router.get('/notifications/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [stats] = await query<{ total: number; subscribed: number }>(
      `SELECT
         COUNT(*) as total,
         COUNT(push_subscription) as subscribed
       FROM users
       WHERE trip_status = 'confirmed'`
    );

    res.json({
      total_confirmed: Number(stats?.total || 0),
      subscribed: Number(stats?.subscribed || 0),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
