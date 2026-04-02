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

    // Get breakdown by event with per-event payment totals
    const costBreakdown = await query<EventCost & { event_title: string; event_date: Date; event_paid: string }>(
      `SELECT ec.*, e.title as event_title, e.start_time as event_date,
              COALESCE(ep.total, 0) as event_paid
       FROM event_costs ec
       JOIN events e ON ec.event_id = e.id
       LEFT JOIN (
         SELECT event_id, SUM(amount) as total
         FROM payments
         WHERE user_id = $1 AND status = 'confirmed' AND event_id IS NOT NULL
         GROUP BY event_id
       ) ep ON ec.event_id = ep.event_id
       WHERE ec.user_id = $1
       ORDER BY e.start_time`,
      [req.user!.userId]
    );

    const totalPaid = Number(balance?.total_paid || 0);
    const totalOwed = Number(balance?.total_owed || 0);

    // Distribute general (non-event-specific) payments across event costs
    // so each line item reflects the user's true remaining amount
    const eventSpecificPaid = costBreakdown.reduce((sum, c) => sum + Number(c.event_paid), 0);
    let generalPaymentsRemaining = totalPaid - eventSpecificPaid;

    const breakdownWithPaid = costBreakdown.map(c => {
      const cost = Number(c.amount);
      const eventPaid = Number(c.event_paid);
      // Apply general payments to cover remaining cost on this event
      const costRemaining = Math.max(0, cost - eventPaid);
      const generalApplied = Math.min(generalPaymentsRemaining, costRemaining);
      generalPaymentsRemaining -= generalApplied;
      return {
        event_id: c.event_id,
        event_title: c.event_title,
        event_date: c.event_date,
        amount: cost,
        amount_paid: eventPaid + generalApplied,
        notes: c.notes,
      };
    });

    res.json({
      summary: {
        total_owed: totalOwed,
        total_paid: totalPaid,
        balance_remaining: Number(balance?.balance_remaining || 0),
      },
      breakdown: breakdownWithPaid,
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
