import webpush from 'web-push';
import { config } from '../config/index.js';
import { query } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import type { User } from '../types/index.js';

// Initialize web-push with VAPID keys
if (config.vapid.publicKey && config.vapid.privateKey) {
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
  logger.info('Web push initialized with VAPID keys');
} else {
  logger.warn('VAPID keys not configured - push notifications disabled');
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: string;
    eventId?: string;
  };
}

export class PushService {
  async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    await query(
      `UPDATE users SET push_subscription = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(subscription), userId]
    );
    logger.info(`Push subscription saved for user ${userId}`);
  }

  async removeSubscription(userId: string): Promise<void> {
    await query(
      `UPDATE users SET push_subscription = NULL, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    logger.info(`Push subscription removed for user ${userId}`);
  }

  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    const user = await query<User>(
      `SELECT push_subscription FROM users WHERE id = $1`,
      [userId]
    );

    if (!user[0]?.push_subscription) {
      logger.debug(`No push subscription for user ${userId}`);
      return false;
    }

    try {
      const subscription = user[0].push_subscription as unknown as PushSubscription;
      await this.sendNotification(subscription, payload);
      return true;
    } catch (error) {
      logger.error(`Failed to send push to user ${userId}:`, error);
      // If subscription is invalid, remove it
      if ((error as { statusCode?: number }).statusCode === 410) {
        await this.removeSubscription(userId);
      }
      return false;
    }
  }

  async sendToAll(payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
    const users = await query<User>(
      `SELECT id, push_subscription FROM users WHERE push_subscription IS NOT NULL`
    );

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const subscription = user.push_subscription as unknown as PushSubscription;
        await this.sendNotification(subscription, payload);
        sent++;
      } catch (error) {
        failed++;
        logger.error(`Failed to send push to user ${user.id}:`, error);
        if ((error as { statusCode?: number }).statusCode === 410) {
          await this.removeSubscription(user.id);
        }
      }
    }

    return { sent, failed };
  }

  async sendToEventAttendees(
    eventId: string,
    payload: NotificationPayload,
    includeOptional: boolean = false
  ): Promise<{ sent: number; failed: number }> {
    // Get users who are confirmed for the trip and either:
    // - It's a mandatory event, or
    // - They RSVPed confirmed to this optional event
    const users = await query<User>(
      `SELECT DISTINCT u.id, u.push_subscription
       FROM users u
       LEFT JOIN rsvps r ON u.id = r.user_id AND r.event_id = $1
       LEFT JOIN events e ON e.id = $1
       WHERE u.push_subscription IS NOT NULL
         AND u.trip_status = 'confirmed'
         AND (
           e.is_mandatory = true
           OR r.status = 'confirmed'
           ${includeOptional ? "OR r.status = 'maybe'" : ''}
         )`,
      [eventId]
    );

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const subscription = user.push_subscription as unknown as PushSubscription;
        await this.sendNotification(subscription, payload);
        sent++;
      } catch (error) {
        failed++;
        if ((error as { statusCode?: number }).statusCode === 410) {
          await this.removeSubscription(user.id);
        }
      }
    }

    return { sent, failed };
  }

  private async sendNotification(
    subscription: PushSubscription,
    payload: NotificationPayload
  ): Promise<void> {
    if (!config.vapid.publicKey || !config.vapid.privateKey) {
      logger.warn('Cannot send push notification - VAPID keys not configured');
      return;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag,
      data: payload.data,
    });

    await webpush.sendNotification(subscription, notificationPayload);
  }

  getPublicKey(): string {
    return config.vapid.publicKey;
  }
}

export const pushService = new PushService();
