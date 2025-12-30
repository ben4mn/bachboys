import { apiClient } from './client';

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = await apiClient.get<{ publicKey: string }>('/notifications/vapid-public-key');
    return response.data.publicKey;
  } catch {
    return null;
  }
}

export async function subscribeToPush(subscription: PushSubscription): Promise<void> {
  await apiClient.post('/notifications/subscribe', { subscription: subscription.toJSON() });
}

export async function unsubscribeFromPush(): Promise<void> {
  await apiClient.delete('/notifications/subscribe');
}

// Admin functions
export interface NotificationPayload {
  title: string;
  body: string;
  type?: 'schedule_change' | 'payment_reminder' | 'event_reminder' | 'general';
  target?: 'all' | 'event';
  eventId?: string;
}

export interface NotificationResult {
  status: string;
  sent: number;
  failed: number;
}

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const response = await apiClient.post<NotificationResult>('/admin/notifications/send', payload);
  return response.data;
}

export interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  type: string;
  target_type: string;
  sent_at: string;
  sent_by_name: string;
  event_title?: string;
}

export async function getNotificationHistory(): Promise<NotificationHistory[]> {
  const response = await apiClient.get<{ notifications: NotificationHistory[] }>('/admin/notifications');
  return response.data.notifications;
}

export interface NotificationStats {
  total_confirmed: number;
  subscribed: number;
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const response = await apiClient.get<NotificationStats>('/admin/notifications/stats');
  return response.data;
}
