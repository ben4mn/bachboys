import { pool } from './pool.js';
import { hashPassword } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const GUESTS = [
  { full_name: 'Nick Fleming', email: 'Fleming_nick15@yahoo.com', is_admin: true, is_groom: true },
  { full_name: 'Ben Foreman', email: 'ben4mn@gmail.com', is_admin: true, is_groom: false },
  { full_name: 'Gabe Schuler', email: null, is_admin: false, is_groom: false },
  { full_name: 'Storm Williams', email: null, is_admin: false, is_groom: false },
  { full_name: 'Zach Neal', email: null, is_admin: false, is_groom: false },
  { full_name: 'Steve Gandara', email: null, is_admin: false, is_groom: false },
  { full_name: 'Chad Hovasse', email: null, is_admin: false, is_groom: false },
  { full_name: 'Alex Kazee', email: null, is_admin: false, is_groom: false },
  { full_name: 'Barrett Bowman', email: null, is_admin: false, is_groom: false },
  { full_name: 'Justin Fleming', email: null, is_admin: false, is_groom: false },
  { full_name: 'Martin Gomez', email: null, is_admin: false, is_groom: false },
  { full_name: 'Os Fregoso', email: null, is_admin: false, is_groom: false },
  { full_name: 'Alan Munoz', email: null, is_admin: false, is_groom: false },
  { full_name: 'Ray Reynolds', email: null, is_admin: false, is_groom: false },
  { full_name: 'Eric Blankenship', email: null, is_admin: false, is_groom: false },
];

const VRBO_LOCATION = '723 Seclusion Glen Ave, Las Vegas NV';
const VRBO_TOTAL = 2528;
const GUEST_COUNT = 14; // excludes groom for cost split
const PER_PERSON_COST = Math.round((VRBO_TOTAL / GUEST_COUNT) * 100) / 100; // ~$180.57

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear all tables (order matters for FK constraints)
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM event_costs');
    await client.query('DELETE FROM rsvps');
    await client.query('DELETE FROM events');
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM password_reset_tokens');
    await client.query('DELETE FROM guest_list');
    await client.query('DELETE FROM users');

    logger.info('Cleared existing data');

    // --- Insert guest list ---
    const guestIds: Record<string, string> = {};
    for (const guest of GUESTS) {
      const normalized = guest.full_name.toLowerCase().trim();
      const result = await client.query(
        `INSERT INTO guest_list (full_name, normalized_name, email, is_admin, is_groom)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [guest.full_name, normalized, guest.email, guest.is_admin, guest.is_groom]
      );
      guestIds[guest.full_name] = result.rows[0].id;
    }
    logger.info(`Inserted ${GUESTS.length} guest list entries`);

    // --- Pre-create admin users (Nick + Ben) ---
    const nickPassword = await hashPassword('groom123');
    const nickResult = await client.query(
      `INSERT INTO users (username, email, password_hash, display_name, is_admin, is_groom, trip_status)
       VALUES ('nick', 'Fleming_nick15@yahoo.com', $1, 'Nick Fleming', true, true, 'confirmed')
       RETURNING id`,
      [nickPassword]
    );
    const nickId = nickResult.rows[0].id;

    // Link Nick's guest_list entry
    await client.query(
      `UPDATE guest_list SET claimed_by = $1, claimed_at = NOW() WHERE id = $2`,
      [nickId, guestIds['Nick Fleming']]
    );

    const benPassword = await hashPassword('admin123');
    const benResult = await client.query(
      `INSERT INTO users (username, email, password_hash, display_name, is_admin, is_groom, trip_status)
       VALUES ('ben', 'ben4mn@gmail.com', $1, 'Ben Foreman', true, false, 'confirmed')
       RETURNING id`,
      [benPassword]
    );
    const benId = benResult.rows[0].id;

    // Link Ben's guest_list entry
    await client.query(
      `UPDATE guest_list SET claimed_by = $1, claimed_at = NOW() WHERE id = $2`,
      [benId, guestIds['Ben Foreman']]
    );

    logger.info('Created admin users: Nick Fleming (groom) and Ben Foreman');

    // --- Seed events ---

    // Friday Apr 3: Check-in
    await client.query(
      `INSERT INTO events (title, description, location, start_time, is_mandatory, total_cost, split_type, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'VRBO Check-In',
        'Check in at the VRBO.',
        VRBO_LOCATION,
        '2026-04-03T16:00:00-07:00',
        true, 0, 'even', 'travel', benId,
      ]
    );

    // Friday Apr 3: F1 Go Kart (optional)
    const gokartTotal = 15 * 100; // $100/person x 15
    const gokartResult = await client.query(
      `INSERT INTO events (title, description, location, start_time, end_time, is_mandatory, total_cost, split_type, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        'F1 Go Kart Racing',
        '3 races. $100 per person. Groom races free.',
        'Las Vegas',
        '2026-04-03T19:00:00-07:00',
        '2026-04-03T21:00:00-07:00',
        false, gokartTotal, 'custom', 'activity', benId,
      ]
    );
    const gokartEventId = gokartResult.rows[0].id;

    // Gokart costs for pre-created users
    await client.query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [gokartEventId, nickId, 0, 'Groom races free']
    );
    await client.query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [gokartEventId, benId, Math.round((gokartTotal / GUEST_COUNT) * 100) / 100, 'Go kart split']
    );

    // Saturday Apr 4: Poker at VRBO
    await client.query(
      `INSERT INTO events (title, description, location, start_time, is_mandatory, total_cost, split_type, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'Poker Tournament',
        'Texas Hold \'em at the VRBO. Bring your game face.',
        VRBO_LOCATION,
        '2026-04-04T13:00:00-07:00',
        false, 0, 'even', 'activity', benId,
      ]
    );

    // Saturday Apr 4: Gambling / free time
    await client.query(
      `INSERT INTO events (title, description, location, start_time, end_time, is_mandatory, total_cost, split_type, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'Gambling & Vegas Debauchery',
        'Hit the strip. Casinos, bars, whatever calls to you.',
        'Las Vegas Strip',
        '2026-04-04T15:00:00-07:00',
        '2026-04-04T18:00:00-07:00',
        false, 0, 'even', 'activity', benId,
      ]
    );

    // Saturday Apr 4: Dinner at Cote
    const coteTotal = 15 * 100; // ~$100+/person
    const coteResult = await client.query(
      `INSERT INTO events (title, description, location, start_time, end_time, is_mandatory, total_cost, split_type, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        'Dinner at Cote',
        'Korean steakhouse. ~$100+ per person. Groom eats free.',
        'Cote Las Vegas',
        '2026-04-04T19:00:00-07:00',
        '2026-04-04T21:00:00-07:00',
        true, coteTotal, 'custom', 'food', benId,
      ]
    );
    const coteEventId = coteResult.rows[0].id;

    // Cote costs for pre-created users
    await client.query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [coteEventId, nickId, 0, 'Groom eats free']
    );
    await client.query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [coteEventId, benId, Math.round((coteTotal / GUEST_COUNT) * 100) / 100, 'Dinner split']
    );

    // Saturday Apr 4: Empire Strips Back (optional)
    const empireTotal = 15 * 80; // $80/person
    const empireResult = await client.query(
      `INSERT INTO events (title, description, location, start_time, end_time, is_mandatory, total_cost, split_type, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        'Empire Strips Back',
        'Burlesque show. $80 per person. Groom gets in free.',
        'Las Vegas',
        '2026-04-04T21:30:00-07:00',
        '2026-04-04T23:30:00-07:00',
        false, empireTotal, 'custom', 'party', benId,
      ]
    );
    const empireEventId = empireResult.rows[0].id;

    // Empire costs for pre-created users
    await client.query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [empireEventId, nickId, 0, 'Groom gets in free']
    );
    await client.query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [empireEventId, benId, Math.round((empireTotal / GUEST_COUNT) * 100) / 100, 'Empire split']
    );

    // Sunday Apr 5: Check-out
    await client.query(
      `INSERT INTO events (title, description, location, start_time, is_mandatory, total_cost, split_type, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'VRBO Check-Out',
        'Check out by 10 AM. Clean up and head out!',
        VRBO_LOCATION,
        '2026-04-05T10:00:00-07:00',
        true, 0, 'even', 'travel', benId,
      ]
    );

    // VRBO Accommodation (cost event spanning the trip)
    const vrboResult = await client.query(
      `INSERT INTO events (title, description, location, start_time, end_time, is_mandatory, total_cost, split_type, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        'VRBO Accommodation',
        `House rental for the weekend. Total: $${VRBO_TOTAL}. Split across ${GUEST_COUNT} guests (~$${PER_PERSON_COST} each). Groom stays free.`,
        VRBO_LOCATION,
        '2026-04-03T16:00:00-07:00',
        '2026-04-05T10:00:00-07:00',
        true, VRBO_TOTAL, 'custom', 'accommodation', benId,
      ]
    );
    const vrboEventId = vrboResult.rows[0].id;

    // VRBO costs for pre-created users
    await client.query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [vrboEventId, nickId, 0, 'Groom stays free']
    );
    await client.query(
      `INSERT INTO event_costs (event_id, user_id, amount, notes) VALUES ($1, $2, $3, $4)`,
      [vrboEventId, benId, PER_PERSON_COST, 'VRBO split']
    );

    logger.info('Created all events with cost splits');

    await client.query('COMMIT');
    logger.info('Database seeded successfully!');

    console.log('\n--- Seed Summary ---');
    console.log(`Guest list: ${GUESTS.length} entries`);
    console.log(`Pre-created users: Nick Fleming (groom), Ben Foreman (admin)`);
    console.log(`Events: VRBO Check-In, VRBO Check-Out, VRBO Accommodation ($${VRBO_TOTAL})`);
    console.log(`Cost per guest: $${PER_PERSON_COST} (groom: $0)`);
    console.log('\nTest Accounts:');
    console.log('  Nick (groom/admin): nick / groom123');
    console.log('  Ben (admin):        ben / admin123');
    console.log('\nOther guests register via the app (name verification required).');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
