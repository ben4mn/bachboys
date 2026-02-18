import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query, queryOne } from '../db/pool.js';
import { validate, rsvpSchema } from '../utils/validators.js';
import { AppError } from '../middleware/errorHandler.js';
import { recalculateEventCosts } from '../utils/recalculateCosts.js';
import type { Event, Rsvp, EventCost, User } from '../types/index.js';

const router = Router();

// GET /api/events - List all events
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await query<Event>(
      `SELECT * FROM events ORDER BY start_time`
    );

    // Get user's RSVPs
    const rsvps = await query<Rsvp>(
      `SELECT * FROM rsvps WHERE user_id = $1`,
      [req.user!.userId]
    );

    const rsvpMap = new Map(rsvps.map(r => [r.event_id, r.status]));

    // Get confirmed attendees with photos for all events
    const confirmedAttendees = await query<{ event_id: string; id: string; display_name: string; photo_url: string | null }>(
      `SELECT r.event_id, u.id, u.display_name, u.photo_url
       FROM rsvps r JOIN users u ON r.user_id = u.id
       WHERE r.status = 'confirmed'
       ORDER BY u.display_name`
    );

    // Get confirmed-trip users for mandatory events
    const confirmedTripUsers = await query<{ id: string; display_name: string; photo_url: string | null }>(
      `SELECT id, display_name, photo_url FROM users WHERE trip_status = 'confirmed' ORDER BY display_name`
    );

    // Build attendee map: event_id -> { attendees (first 5), count }
    const attendeeMap = new Map<string, { attendees: { id: string; display_name: string; photo_url: string | null }[]; count: number }>();
    for (const a of confirmedAttendees) {
      if (!attendeeMap.has(a.event_id)) {
        attendeeMap.set(a.event_id, { attendees: [], count: 0 });
      }
      const entry = attendeeMap.get(a.event_id)!;
      entry.count++;
      if (entry.attendees.length < 5) {
        entry.attendees.push({ id: a.id, display_name: a.display_name, photo_url: a.photo_url });
      }
    }

    const eventsWithRsvp = events.map(event => {
      let eventAttendees;
      if (event.is_mandatory) {
        eventAttendees = {
          attendees: confirmedTripUsers.slice(0, 5),
          count: confirmedTripUsers.length,
        };
      } else {
        eventAttendees = attendeeMap.get(event.id) || { attendees: [], count: 0 };
      }
      return {
        ...event,
        user_rsvp: rsvpMap.get(event.id) || 'pending',
        attendees: eventAttendees.attendees,
        attendee_count: eventAttendees.count,
      };
    });

    res.json({ events: eventsWithRsvp });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:id - Get event details
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await queryOne<Event>(
      `SELECT * FROM events WHERE id = $1`,
      [req.params.id]
    );

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Get attendees (users who confirmed)
    const attendees = await query<{ id: string; display_name: string; photo_url: string | null; status: string }>(
      `SELECT u.id, u.display_name, u.photo_url, r.status
       FROM users u
       LEFT JOIN rsvps r ON u.id = r.user_id AND r.event_id = $1
       WHERE r.status = 'confirmed' OR $2 = true
       ORDER BY u.display_name`,
      [req.params.id, event.is_mandatory]
    );

    // Get user's cost for this event
    const userCost = await queryOne<EventCost>(
      `SELECT * FROM event_costs WHERE event_id = $1 AND user_id = $2`,
      [req.params.id, req.user!.userId]
    );

    // Get user's RSVP
    const userRsvp = await queryOne<Rsvp>(
      `SELECT * FROM rsvps WHERE event_id = $1 AND user_id = $2`,
      [req.params.id, req.user!.userId]
    );

    res.json({
      event,
      attendees,
      user_cost: userCost?.amount || 0,
      user_rsvp: userRsvp?.status || 'pending',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/events/:eventId/rsvp - RSVP to an event
router.put('/:eventId/rsvp', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = validate(rsvpSchema, req.body);

    // Check if event exists and is not mandatory
    const event = await queryOne<Event>(
      `SELECT * FROM events WHERE id = $1`,
      [req.params.eventId]
    );

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (event.is_mandatory) {
      throw new AppError('Cannot RSVP to mandatory events', 400);
    }

    // Upsert RSVP
    const [rsvp] = await query<Rsvp>(
      `INSERT INTO rsvps (user_id, event_id, status, responded_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, event_id)
       DO UPDATE SET status = $3, responded_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [req.user!.userId, req.params.eventId, status]
    );

    // Recalculate costs for this event with updated attendance
    recalculateEventCosts(req.params.eventId).catch(() => {});

    res.json({ rsvp });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:id/attendees - Get event attendee list
router.get('/:id/attendees', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await queryOne<Event>(
      `SELECT * FROM events WHERE id = $1`,
      [req.params.id]
    );

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // For mandatory events, show all confirmed trip attendees
    // For optional events, show RSVPs
    let attendees;
    if (event.is_mandatory) {
      attendees = await query<{ id: string; display_name: string; photo_url: string | null; trip_status: string }>(
        `SELECT id, display_name, photo_url, trip_status
         FROM users
         WHERE trip_status = 'confirmed'
         ORDER BY display_name`
      );
    } else {
      attendees = await query<{ id: string; display_name: string; photo_url: string | null; status: string }>(
        `SELECT u.id, u.display_name, u.photo_url, COALESCE(r.status, 'pending') as status
         FROM users u
         LEFT JOIN rsvps r ON u.id = r.user_id AND r.event_id = $1
         WHERE u.trip_status = 'confirmed'
         ORDER BY
           CASE r.status
             WHEN 'confirmed' THEN 1
             WHEN 'maybe' THEN 2
             WHEN 'pending' THEN 3
             ELSE 4
           END,
           u.display_name`,
        [req.params.id]
      );
    }

    res.json({ attendees });
  } catch (error) {
    next(error);
  }
});

export default router;
