import { pool } from './pool.js';
import { hashPassword } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing data (in order due to foreign keys)
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM event_costs');
    await client.query('DELETE FROM rsvps');
    await client.query('DELETE FROM events');
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM users');

    logger.info('Cleared existing data');

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    const adminResult = await client.query(`
      INSERT INTO users (username, email, password_hash, display_name, is_admin, trip_status)
      VALUES ('admin', 'admin@bachboys.app', $1, 'Admin', true, 'confirmed')
      RETURNING id
    `, [adminPassword]);
    const adminId = adminResult.rows[0].id;
    logger.info('Created admin user (username: admin, password: admin123)');

    // Create groom (Nick)
    const groomPassword = await hashPassword('groom123');
    const groomResult = await client.query(`
      INSERT INTO users (username, email, password_hash, display_name, is_admin, is_groom, trip_status, venmo_handle)
      VALUES ('nick', 'nick@bachboys.app', $1, 'Nick (The Groom)', false, true, 'confirmed', '@nick-groom')
      RETURNING id
    `, [groomPassword]);
    const groomId = groomResult.rows[0].id;
    logger.info('Created groom user (username: nick, password: groom123)');

    // Create some attendees
    const attendees = [
      { username: 'mike', display_name: 'Mike', status: 'confirmed' },
      { username: 'dave', display_name: 'Dave', status: 'confirmed' },
      { username: 'chris', display_name: 'Chris', status: 'maybe' },
      { username: 'tom', display_name: 'Tom', status: 'invited' },
    ];

    const attendeeIds: string[] = [];
    for (const att of attendees) {
      const password = await hashPassword('test123');
      const result = await client.query(`
        INSERT INTO users (username, email, password_hash, display_name, trip_status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [att.username, `${att.username}@test.com`, password, att.display_name, att.status]);
      attendeeIds.push(result.rows[0].id);
    }
    logger.info('Created attendee users (password: test123 for all)');

    // Create sample events
    const events = [
      {
        title: 'Arrive in Vegas',
        description: 'Meet at the hotel lobby. Check-in starts at 3 PM.',
        location: 'Cosmopolitan Las Vegas',
        location_url: 'https://maps.google.com/?q=Cosmopolitan+Las+Vegas',
        start_time: '2025-03-14T15:00:00Z',
        end_time: '2025-03-14T17:00:00Z',
        is_mandatory: true,
        total_cost: 0,
        category: 'travel',
      },
      {
        title: 'Pool Party',
        description: 'Kick off the weekend at the pool! Drinks and cabanas included.',
        location: 'Marquee Dayclub',
        location_url: 'https://maps.google.com/?q=Marquee+Dayclub',
        start_time: '2025-03-14T18:00:00Z',
        end_time: '2025-03-14T22:00:00Z',
        is_mandatory: false,
        total_cost: 600,
        split_type: 'even',
        category: 'party',
      },
      {
        title: 'Group Dinner',
        description: 'Steak dinner to fuel up for the night ahead.',
        location: 'STK Steakhouse',
        location_url: 'https://maps.google.com/?q=STK+Las+Vegas',
        start_time: '2025-03-14T20:00:00Z',
        end_time: '2025-03-14T22:00:00Z',
        is_mandatory: true,
        total_cost: 1200,
        split_type: 'even',
        category: 'food',
      },
      {
        title: 'Club Night',
        description: 'VIP table at Omnia. Bottle service included.',
        location: 'Omnia Nightclub',
        location_url: 'https://maps.google.com/?q=Omnia+Nightclub+Las+Vegas',
        start_time: '2025-03-15T00:00:00Z',
        end_time: '2025-03-15T04:00:00Z',
        is_mandatory: false,
        total_cost: 2500,
        split_type: 'custom',
        category: 'party',
      },
      {
        title: 'Recovery Brunch',
        description: 'Late brunch with bottomless mimosas.',
        location: 'Mon Ami Gabi',
        start_time: '2025-03-15T12:00:00Z',
        end_time: '2025-03-15T14:00:00Z',
        is_mandatory: true,
        total_cost: 400,
        split_type: 'even',
        category: 'food',
      },
      {
        title: 'Golf Tournament',
        description: 'Bachelor party golf scramble. Carts and drinks included.',
        location: 'Top Golf Las Vegas',
        location_url: 'https://maps.google.com/?q=Top+Golf+Las+Vegas',
        start_time: '2025-03-15T15:00:00Z',
        end_time: '2025-03-15T18:00:00Z',
        is_mandatory: false,
        total_cost: 800,
        split_type: 'even',
        category: 'activity',
      },
      {
        title: 'Final Dinner',
        description: 'Last supper before heading home. Speeches encouraged!',
        location: 'Nobu Restaurant',
        start_time: '2025-03-15T19:00:00Z',
        end_time: '2025-03-15T21:00:00Z',
        is_mandatory: true,
        total_cost: 1000,
        split_type: 'even',
        category: 'food',
      },
      {
        title: 'Depart Vegas',
        description: 'Check out by 11 AM. Safe travels everyone!',
        location: 'Cosmopolitan Las Vegas',
        start_time: '2025-03-16T11:00:00Z',
        is_mandatory: true,
        total_cost: 0,
        category: 'travel',
      },
    ];

    const eventIds: string[] = [];
    for (const event of events) {
      const result = await client.query(`
        INSERT INTO events (title, description, location, location_url, start_time, end_time, is_mandatory, total_cost, split_type, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        event.title,
        event.description,
        event.location,
        event.location_url || null,
        event.start_time,
        event.end_time || null,
        event.is_mandatory,
        event.total_cost,
        event.split_type || 'even',
        event.category,
      ]);
      eventIds.push(result.rows[0].id);
    }
    logger.info(`Created ${events.length} sample events`);

    // Create RSVPs for optional events (confirmed attendees auto-RSVP to mandatory)
    // For pool party (event index 1) - some confirmed, some maybe
    await client.query(`
      INSERT INTO rsvps (user_id, event_id, status) VALUES ($1, $2, 'confirmed')
    `, [attendeeIds[0], eventIds[1]]); // Mike confirmed
    await client.query(`
      INSERT INTO rsvps (user_id, event_id, status) VALUES ($1, $2, 'maybe')
    `, [attendeeIds[1], eventIds[1]]); // Dave maybe

    // For club night (event index 3)
    await client.query(`
      INSERT INTO rsvps (user_id, event_id, status) VALUES ($1, $2, 'confirmed')
    `, [attendeeIds[0], eventIds[3]]); // Mike confirmed
    await client.query(`
      INSERT INTO rsvps (user_id, event_id, status) VALUES ($1, $2, 'confirmed')
    `, [attendeeIds[1], eventIds[3]]); // Dave confirmed

    logger.info('Created sample RSVPs');

    // Set custom costs for club night (groom pays $0)
    const clubNightEventId = eventIds[3];
    await client.query(`
      INSERT INTO event_costs (event_id, user_id, amount, notes)
      VALUES ($1, $2, $3, $4)
    `, [clubNightEventId, groomId, 0, 'Groom pays nothing!']);

    logger.info('Created custom cost splits (groom = $0 for club night)');

    // Create a sample payment
    await client.query(`
      INSERT INTO payments (user_id, amount, payment_method, status, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [attendeeIds[0], 500, 'venmo', 'confirmed', 'Initial deposit']);

    logger.info('Created sample payment');

    await client.query('COMMIT');
    logger.info('✅ Database seeded successfully!');

    console.log('\n📋 Test Accounts:');
    console.log('  Admin:  admin / admin123');
    console.log('  Groom:  nick / groom123');
    console.log('  Others: mike, dave, chris, tom / test123');

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
