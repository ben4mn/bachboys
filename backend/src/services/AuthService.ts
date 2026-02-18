import jwt from 'jsonwebtoken';
import Fuse from 'fuse.js';
import { config } from '../config/index.js';
import { query, queryOne } from '../db/pool.js';
import { hashPassword, verifyPassword, hashToken, generateSecureToken } from '../utils/crypto.js';
import { AppError } from '../middleware/errorHandler.js';
import { emailService } from './EmailService.js';
import { recalculateAllMandatoryCosts } from '../utils/recalculateCosts.js';
import { logger } from '../utils/logger.js';
import type { User, JwtPayload, RefreshToken } from '../types/index.js';

interface GuestListEntry {
  id: string;
  full_name: string;
  normalized_name: string;
  email: string | null;
  is_admin: boolean;
  is_groom: boolean;
  claimed_by: string | null;
}

export class AuthService {
  async register(data: {
    real_name: string;
    username: string;
    email: string;
    password: string;
    display_name: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Fuzzy match against guest list
    const match = await this.fuzzyMatchGuest(data.real_name);
    if (!match) {
      throw new AppError('Name not found on the guest list', 400);
    }
    if (match.claimed_by) {
      throw new AppError('This guest has already registered', 400);
    }

    // Check if username or email already exists
    const existing = await queryOne<User>(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [data.username, data.email]
    );

    if (existing) {
      throw new AppError('Username or email already exists', 400);
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user — inherit admin/groom flags from guest list
    const [user] = await query<User>(
      `INSERT INTO users (username, email, password_hash, display_name, is_admin, is_groom, trip_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
       RETURNING *`,
      [data.username, data.email, passwordHash, data.display_name, match.is_admin, match.is_groom]
    );

    // Link guest list entry
    await query(
      `UPDATE guest_list SET claimed_by = $1, claimed_at = NOW() WHERE id = $2`,
      [user.id, match.id]
    );

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // Recalculate mandatory event costs to include new user
    recalculateAllMandatoryCosts().catch((err) =>
      logger.error('Failed to recalculate costs after registration:', err)
    );

    // Send welcome email (non-blocking)
    if (data.email) {
      emailService.sendWelcomeEmail(data.email, data.display_name).catch(() => {});
    }

    return { user, accessToken, refreshToken };
  }

  async verifyName(realName: string): Promise<{ matched: boolean; guest_name?: string }> {
    const match = await this.fuzzyMatchGuest(realName);
    if (!match) {
      return { matched: false };
    }
    if (match.claimed_by) {
      return { matched: false };
    }
    return { matched: true, guest_name: match.full_name };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await queryOne<User>(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (!user) return; // Silent — don't reveal if email exists

    // Invalidate any existing tokens for this user
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    // Generate token
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    // Send email (non-blocking)
    emailService.sendPasswordResetEmail(email, rawToken).catch(() => {});
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);

    const resetToken = await queryOne<{
      id: string;
      user_id: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (!resetToken) {
      throw new AppError('Invalid reset token', 400);
    }
    if (resetToken.used_at) {
      throw new AppError('Reset token has already been used', 400);
    }
    if (new Date(resetToken.expires_at) < new Date()) {
      throw new AppError('Reset token has expired', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      resetToken.user_id,
    ]);

    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetToken.id]);
  }

  async login(username: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Find user
    const user = await queryOne<User>(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return { user, accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashToken(refreshToken);

    // Find valid refresh token
    const storedToken = await queryOne<RefreshToken & { user_id: string }>(
      `SELECT rt.*, u.username, u.is_admin
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1
         AND rt.expires_at > NOW()
         AND rt.revoked_at IS NULL`,
      [tokenHash]
    );

    if (!storedToken) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Get user
    const user = await queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [storedToken.user_id]
    );

    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Revoke old token
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [storedToken.id]
    );

    // Generate new tokens
    return this.generateTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );
  }

  async getUser(userId: string): Promise<User | null> {
    return queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
  }

  private async fuzzyMatchGuest(realName: string): Promise<GuestListEntry | null> {
    const guests = await query<GuestListEntry>(
      'SELECT id, full_name, normalized_name, email, is_admin, is_groom, claimed_by FROM guest_list'
    );

    const fuse = new Fuse(guests, {
      keys: ['full_name'],
      threshold: 0.4,
      includeScore: true,
    });

    const results = fuse.search(realName);
    if (results.length === 0) return null;

    return results[0].item;
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiresIn,
    });

    const refreshToken = generateSecureToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
