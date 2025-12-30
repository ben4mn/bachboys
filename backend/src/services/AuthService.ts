import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { query, queryOne } from '../db/pool.js';
import { hashPassword, verifyPassword, hashToken, generateSecureToken } from '../utils/crypto.js';
import { AppError } from '../middleware/errorHandler.js';
import type { User, JwtPayload, RefreshToken } from '../types/index.js';

export class AuthService {
  async register(data: {
    username: string;
    email: string;
    password: string;
    display_name: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
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

    // Create user
    const [user] = await query<User>(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.username, data.email, passwordHash, data.display_name]
    );

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return { user, accessToken, refreshToken };
  }

  async login(username: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Find user
    const user = await queryOne<User>(
      'SELECT * FROM users WHERE username = $1',
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
