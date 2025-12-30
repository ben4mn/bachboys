import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query, queryOne } from '../db/pool.js';
import { validate, paymentSchema } from '../utils/validators.js';
import type { Payment, UserBalance, EventCost } from '../types/index.js';

const router = Router();

// GET /api/payments - Get current user's payments
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await query<Payment & { event_title?: string }>(
      `SELECT p.*, e.title as event_title
       FROM payments p
       LEFT JOIN events e ON p.event_id = e.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user!.userId]
    );

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/summary - Get user's balance summary
router.get('/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user's balance
    const balance = await queryOne<UserBalance>(
      `SELECT * FROM user_balances WHERE user_id = $1`,
      [req.user!.userId]
    );

    // Get breakdown by event
    const costBreakdown = await query<EventCost & { event_title: string; event_date: Date }>(
      `SELECT ec.*, e.title as event_title, e.start_time as event_date
       FROM event_costs ec
       JOIN events e ON ec.event_id = e.id
       WHERE ec.user_id = $1
       ORDER BY e.start_time`,
      [req.user!.userId]
    );

    res.json({
      summary: {
        total_owed: Number(balance?.total_owed || 0),
        total_paid: Number(balance?.total_paid || 0),
        balance_remaining: Number(balance?.balance_remaining || 0),
      },
      breakdown: costBreakdown.map(c => ({
        event_id: c.event_id,
        event_title: c.event_title,
        event_date: c.event_date,
        amount: Number(c.amount),
        notes: c.notes,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payments - Report a payment made
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(paymentSchema, req.body);

    const [payment] = await query<Payment>(
      `INSERT INTO payments (user_id, event_id, amount, payment_method, payment_reference, notes, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        req.user!.userId,
        data.event_id || null,
        data.amount,
        data.payment_method,
        data.payment_reference || null,
        data.notes || null,
      ]
    );

    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
});

export default router;
