import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { Send, Bell, Users, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Card } from '../../components/shared/Card';
import { Badge } from '../../components/shared/Badge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { getEvents } from '../../api/events';
import {
  sendNotification,
  getNotificationHistory,
  getNotificationStats,
  type NotificationPayload,
} from '../../api/notifications';
import { getErrorMessage } from '../../api/client';

interface NotificationForm {
  title: string;
  body: string;
  type: 'general' | 'schedule_change' | 'payment_reminder' | 'event_reminder';
  target: 'all' | 'event';
  eventId?: string;
}

const notificationTypes = [
  { value: 'general', label: 'General', icon: Bell },
  { value: 'schedule_change', label: 'Schedule Change', icon: Calendar },
  { value: 'payment_reminder', label: 'Payment Reminder', icon: Users },
  { value: 'event_reminder', label: 'Event Reminder', icon: Clock },
];

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['admin', 'notification-stats'],
    queryFn: getNotificationStats,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['admin', 'notification-history'],
    queryFn: getNotificationHistory,
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<NotificationForm>({
    defaultValues: {
      title: '',
      body: '',
      type: 'general',
      target: 'all',
    },
  });

  const target = watch('target');

  const sendMutation = useMutation({
    mutationFn: (data: NotificationPayload) => sendNotification(data),
    onSuccess: (data) => {
      setResult({ sent: data.sent, failed: data.failed });
      reset();
      queryClient.invalidateQueries({ queryKey: ['admin', 'notification-history'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const onSubmit = (data: NotificationForm) => {
    setError(null);
    setResult(null);
    sendMutation.mutate({
      title: data.title,
      body: data.body,
      type: data.type,
      target: data.target,
      eventId: data.target === 'event' ? data.eventId : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-600">Send push notifications to attendees</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Bell className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats?.subscribed || 0}
              </div>
              <div className="text-sm text-gray-500">
                of {stats?.total_confirmed || 0} subscribed
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {history?.length || 0}
              </div>
              <div className="text-sm text-gray-500">notifications sent</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Send Notification Form */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Send Notification</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Sent to {result.sent} users
            {result.failed > 0 && ` (${result.failed} failed)`}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="input"
              placeholder="Notification title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              {...register('body', { required: 'Message is required' })}
              className="input resize-none"
              rows={3}
              placeholder="What do you want to tell everyone?"
            />
            {errors.body && (
              <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select {...register('type')} className="input">
                {notificationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target
              </label>
              <select {...register('target')} className="input">
                <option value="all">All Subscribed Users</option>
                <option value="event">Event Attendees</option>
              </select>
            </div>
          </div>

          {target === 'event' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event
              </label>
              <select {...register('eventId')} className="input">
                <option value="">Select event...</option>
                {events?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={sendMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {sendMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Notification
              </>
            )}
          </button>
        </form>
      </Card>

      {/* Notification History */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Recent Notifications</h2>

        {historyLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {!historyLoading && history && history.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            No notifications sent yet
          </div>
        )}

        <div className="space-y-3">
          {history?.map((notification) => (
            <div
              key={notification.id}
              className="p-3 border rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {notification.body}
                  </div>
                </div>
                <Badge>{notification.type}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>
                  Sent by {notification.sent_by_name}
                </span>
                <span>
                  {format(parseISO(notification.sent_at), 'MMM d, h:mm a')}
                </span>
                {notification.event_title && (
                  <span>to {notification.event_title} attendees</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
