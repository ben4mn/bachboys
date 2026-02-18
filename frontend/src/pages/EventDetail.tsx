import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { MapPin, Clock, DollarSign, ExternalLink, Check, X, HelpCircle } from 'lucide-react';
import { Header } from '../components/shared/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { LinkedText } from '../components/shared/LinkedText';
import { getEvent, updateRsvp } from '../api/events';
import { useAuthStore } from '../store/authStore';
import type { RsvpStatus } from '../types';

const rsvpOptions: { status: RsvpStatus; label: string; icon: typeof Check }[] = [
  { status: 'confirmed', label: 'Going', icon: Check },
  { status: 'maybe', label: 'Maybe', icon: HelpCircle },
  { status: 'declined', label: 'Can\'t Go', icon: X },
];

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: (status: RsvpStatus) => updateRsvp(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  if (isLoading) {
    return (
      <>
        <Header title="Event" showBack />
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header title="Event" showBack />
        <div className="p-4 m-4 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-center">
          Failed to load event
        </div>
      </>
    );
  }

  const { event, attendees, user_cost, user_rsvp } = data;

  return (
    <>
      <Header title={event.title} showBack />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Event Info */}
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <div className="font-medium dark:text-white">
                  {format(parseISO(event.start_time), 'EEEE, MMMM d')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {format(parseISO(event.start_time), 'h:mm a')}
                  {event.end_time && ` - ${format(parseISO(event.end_time), 'h:mm a')}`}
                </div>
              </div>
            </div>

            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium dark:text-white">{event.location}</div>
                  {event.location_url && (
                    <a
                      href={event.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 flex items-center gap-1"
                    >
                      Open in Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {event.event_url && (
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <a
                  href={event.event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 font-medium flex items-center gap-1"
                >
                  Event Details <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {Number(event.total_cost) > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  {currentUser?.is_groom && event.exclude_groom ? (
                    <>
                      <div className="font-medium text-green-600">$0.00</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">You're covered — the boys got you</div>
                    </>
                  ) : Number(user_cost) > 0 ? (
                    <>
                      <div className="font-medium dark:text-white">${Number(user_cost).toFixed(2)}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Your share{event.exclude_groom ? ' · covers the groom' : ''}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium dark:text-white">
                        {event.split_type === 'fixed'
                          ? `$${Number(event.total_cost).toFixed(0)}/person`
                          : `$${Number(event.total_cost).toFixed(0)} total`}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Cost split pending</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-4 text-gray-700 dark:text-gray-300 border-t dark:border-gray-700 pt-4">
              <LinkedText text={event.description} />
            </p>
          )}

          {event.notes && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
              <LinkedText text={event.notes} />
            </p>
          )}
        </Card>

        {/* RSVP (only for optional events) */}
        {!event.is_mandatory && (
          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Your Response</h2>
            <div className="flex gap-2">
              {rsvpOptions.map(({ status, label, icon: Icon }) => (
                <button
                  key={status}
                  onClick={() => rsvpMutation.mutate(status)}
                  disabled={rsvpMutation.isPending}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium transition-colors ${
                    user_rsvp === status
                      ? status === 'confirmed'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : status === 'maybe'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'border-gray-400 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Attendees */}
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            {event.is_mandatory ? 'Attendees' : 'Who\'s Going'}
          </h2>
          <div className="space-y-2">
            {attendees.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No responses yet</p>
            ) : (
              attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center gap-3">
                  {attendee.photo_url ? (
                    <img
                      src={attendee.photo_url}
                      alt={attendee.display_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-sm">
                      {attendee.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 font-medium dark:text-white">{attendee.display_name}</span>
                  {!event.is_mandatory && (
                    <Badge
                      variant={
                        attendee.status === 'confirmed'
                          ? 'success'
                          : attendee.status === 'maybe'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {attendee.status}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
