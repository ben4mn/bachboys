import { pool } from '../pool.js';
import { logger } from '../../utils/logger.js';

const migrations = [
  // 001: Create users table
  {
    name: '001_create_users',
    up: `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        bio TEXT,
        photo_url TEXT,
        phone VARCHAR(20),
        venmo_handle VARCHAR(100),
        is_admin BOOLEAN DEFAULT false,
        is_groom BOOLEAN DEFAULT false,
        trip_status VARCHAR(20) DEFAULT 'invited'
          CHECK (trip_status IN ('invited', 'confirmed', 'declined', 'maybe')),
        push_subscription JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `,
  },
  // 002: Create refresh_tokens table
  {
    name: '002_create_refresh_tokens',
    up: `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
    `,
  },
  // 003: Create events table
  {
    name: '003_create_events',
    up: `
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location TEXT,
        location_url TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        is_mandatory BOOLEAN DEFAULT false,
        total_cost DECIMAL(10, 2) DEFAULT 0,
        split_type VARCHAR(20) DEFAULT 'even'
          CHECK (split_type IN ('even', 'custom', 'fixed')),
        category VARCHAR(50),
        image_url TEXT,
        notes TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
      CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
    `,
  },
  // 004: Create rsvps table
  {
    name: '004_create_rsvps',
    up: `
      CREATE TABLE IF NOT EXISTS rsvps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending', 'confirmed', 'declined', 'maybe')),
        responded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, event_id)
      );

      CREATE INDEX IF NOT EXISTS idx_rsvps_user ON rsvps(user_id);
      CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event_id);
    `,
  },
  // 005: Create event_costs table
  {
    name: '005_create_event_costs',
    up: `
      CREATE TABLE IF NOT EXISTS event_costs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_event_costs_event ON event_costs(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_costs_user ON event_costs(user_id);
    `,
  },
  // 006: Create payments table
  {
    name: '006_create_payments',
    up: `
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE SET NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50)
          CHECK (payment_method IN ('venmo', 'cash', 'zelle', 'paypal', 'credit_card', 'other')),
        payment_reference TEXT,
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending', 'confirmed', 'rejected')),
        paid_to UUID REFERENCES users(id),
        notes TEXT,
        paid_at TIMESTAMP,
        confirmed_by UUID REFERENCES users(id),
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(event_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    `,
  },
  // 007: Create notifications table
  {
    name: '007_create_notifications',
    up: `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(50)
          CHECK (type IN ('schedule_change', 'payment_reminder', 'event_reminder', 'general')),
        target_type VARCHAR(20) DEFAULT 'all'
          CHECK (target_type IN ('all', 'specific_users', 'attending_event')),
        target_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
        target_user_ids UUID[],
        sent_at TIMESTAMP,
        sent_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
    `,
  },
  // 008: Create views
  {
    name: '008_create_views',
    up: `
      CREATE OR REPLACE VIEW user_balances AS
      SELECT
        u.id AS user_id,
        u.display_name,
        COALESCE(costs.total_owed, 0) AS total_owed,
        COALESCE(payments.total_paid, 0) AS total_paid,
        COALESCE(costs.total_owed, 0) - COALESCE(payments.total_paid, 0) AS balance_remaining
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS total_owed
        FROM event_costs
        GROUP BY user_id
      ) costs ON u.id = costs.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS total_paid
        FROM payments
        WHERE status = 'confirmed'
        GROUP BY user_id
      ) payments ON u.id = payments.user_id;

      CREATE OR REPLACE VIEW event_attendance AS
      SELECT
        e.id AS event_id,
        e.title,
        e.is_mandatory,
        COUNT(CASE WHEN r.status = 'confirmed' THEN 1 END) AS confirmed_count,
        COUNT(CASE WHEN r.status = 'declined' THEN 1 END) AS declined_count,
        COUNT(CASE WHEN r.status = 'maybe' THEN 1 END) AS maybe_count,
        COUNT(CASE WHEN r.status = 'pending' OR r.status IS NULL THEN 1 END) AS pending_count
      FROM events e
      LEFT JOIN rsvps r ON e.id = r.event_id
      GROUP BY e.id, e.title, e.is_mandatory;
    `,
  },
  // 009: Create guest_list table
  {
    name: '009_create_guest_list',
    up: `
      CREATE TABLE IF NOT EXISTS guest_list (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name VARCHAR(100) NOT NULL,
        normalized_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        is_admin BOOLEAN DEFAULT false,
        is_groom BOOLEAN DEFAULT false,
        claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        claimed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_guest_list_normalized_name ON guest_list(normalized_name);
      CREATE INDEX IF NOT EXISTS idx_guest_list_claimed_by ON guest_list(claimed_by);
    `,
  },
  // 010: Create password_reset_tokens table
  {
    name: '010_create_password_reset_tokens',
    up: `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
    `,
  },
  // 011: Add exclude_groom column to events
  {
    name: '011_add_exclude_groom',
    up: `ALTER TABLE events ADD COLUMN IF NOT EXISTS exclude_groom BOOLEAN DEFAULT true;`,
  },
];

// Track migrations
const createMigrationsTable = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    // Create migrations tracking table
    await client.query(createMigrationsTable);

    // Get executed migrations
    const result = await client.query('SELECT name FROM _migrations');
    const executedMigrations = new Set(result.rows.map((r) => r.name));

    // Run pending migrations
    for (const migration of migrations) {
      if (!executedMigrations.has(migration.name)) {
        logger.info(`Running migration: ${migration.name}`);
        await client.query('BEGIN');
        try {
          await client.query(migration.up);
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name]);
          await client.query('COMMIT');
          logger.info(`Migration completed: ${migration.name}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    }

    logger.info('All migrations completed');
  } finally {
    client.release();
  }
}
