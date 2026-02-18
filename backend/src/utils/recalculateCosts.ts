import { query, queryOne } from '../db/pool.js';
import { logger } from './logger.js';

interface EventRow {
  id: string;
  total_cost: string;
  split_type: string;
  is_mandatory: boolean;
  exclude_groom: boolean;
}

/**
 * Recalculate even-split costs for a single event based on current attendance.
 * - Mandatory events: all confirmed-trip users
 * - Optional events: all users with RSVP 'confirmed'
 * Skips events with split_type !== 'even' (admin-managed custom splits).
 */
export async function recalculateEventCosts(eventId: string): Promise<void> {
  const event = await queryOne<EventRow>(
    `SELECT id, total_cost, split_type, is_mandatory, exclude_groom FROM events WHERE id = $1`,
    [eventId]
  );

  if (!event) return;
  if (event.split_type === 'custom') return;
  if (Number(event.total_cost) === 0) return;

  let payingAttendees: { id: string }[];

  if (event.is_mandatory) {
    // All confirmed-trip users, optionally excluding groom
    payingAttendees = event.exclude_groom
      ? await query<{ id: string }>(
          `SELECT id FROM users WHERE trip_status = 'confirmed' AND is_groom = false`
        )
      : await query<{ id: string }>(
          `SELECT id FROM users WHERE trip_status = 'confirmed'`
        );
  } else {
    // Only users who RSVP'd confirmed to this event
    payingAttendees = event.exclude_groom
      ? await query<{ id: string }>(
          `SELECT u.id FROM users u
           JOIN rsvps r ON u.id = r.user_id AND r.event_id = $1
           WHERE r.status = 'confirmed' AND u.is_groom = false`,
          [eventId]
        )
      : await query<{ id: string }>(
          `SELECT u.id FROM users u
           JOIN rsvps r ON u.id = r.user_id AND r.event_id = $1
           WHERE r.status = 'confirmed'`,
          [eventId]
        );
  }

  // Clear existing costs for this event
  await query(`DELETE FROM event_costs WHERE event_id = $1`, [eventId]);

  if (payingAttendees.length === 0) return;

  const totalCost = Number(event.total_cost);
  let perPersonCost: number;
  let note: string;

  if (event.split_type === 'fixed') {
    // totalCost is the per-person rate
    if (event.exclude_groom) {
      // Get all attendees (including groom) to compute absorbed cost
      let allAttendees: { id: string }[];
      if (event.is_mandatory) {
        allAttendees = await query<{ id: string }>(
          `SELECT id FROM users WHERE trip_status = 'confirmed'`
        );
      } else {
        allAttendees = await query<{ id: string }>(
          `SELECT u.id FROM users u
           JOIN rsvps r ON u.id = r.user_id AND r.event_id = $1
           WHERE r.status = 'confirmed'`,
          [eventId]
        );
      }
      perPersonCost = (totalCost * allAttendees.length) / payingAttendees.length;
      note = `$${totalCost.toFixed(0)}/person (covers groom)`;
    } else {
      perPersonCost = totalCost;
      note = `$${totalCost.toFixed(0)}/person`;
    }
  } else {
    // even split: totalCost is the group total
    perPersonCost = totalCost / payingAttendees.length;
    note = event.exclude_groom
      ? `$${totalCost.toFixed(0)} ÷ ${payingAttendees.length} (covers groom)`
      : `Even split`;
  }

  for (const attendee of payingAttendees) {
    await query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [eventId, attendee.id, perPersonCost, note]
    );
  }

  // Add groom's $0 entry if excluded and attending
  if (event.exclude_groom) {
    const groom = await queryOne<{ id: string }>(`SELECT id FROM users WHERE is_groom = true`);
    if (groom) {
      let groomAttending = event.is_mandatory;
      if (!groomAttending) {
        const groomRsvp = await queryOne<{ status: string }>(
          `SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2`,
          [groom.id, eventId]
        );
        groomAttending = groomRsvp?.status === 'confirmed';
      }
      if (groomAttending) {
        await query(
          `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, 0, $3)`,
          [eventId, groom.id, 'Groom — covered by the crew']
        );
      }
    }
  }

  logger.info(`Recalculated costs for event ${eventId}: $${perPersonCost.toFixed(2)}/person × ${payingAttendees.length}`);
}

/**
 * Recalculate costs for all mandatory even-split events.
 * Called when a user registers or changes trip_status.
 */
export async function recalculateAllMandatoryCosts(): Promise<void> {
  const events = await query<{ id: string }>(
    `SELECT id FROM events WHERE is_mandatory = true AND split_type IN ('even', 'fixed') AND total_cost > 0`
  );

  for (const event of events) {
    await recalculateEventCosts(event.id);
  }

  logger.info(`Recalculated costs for ${events.length} mandatory events`);
}
