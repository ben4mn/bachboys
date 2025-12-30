import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { MapPin, Clock, Users, ChevronRight } from 'lucide-react';
import { Header } from '../components/shared/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { getEvents } from '../api/events';
import type { Event } from '../types';

function formatEventDate(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

function formatEventTime(dateString: string): string {
  return format(parseISO(dateString), 'h:mm a');
}

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const getRsvpBadge = () => {
    if (event.is_mandatory) {
      return <Badge variant="error">Required</Badge>;
    }
    switch (event.user_rsvp) {
      case 'confirmed':
        return <Badge variant="success">Going</Badge>;
      case 'declined':
        return <Badge variant="default">Not Going</Badge>;
      case 'maybe':
        return <Badge variant="warning">Maybe</Badge>;
      default:
        return <Badge variant="info">RSVP</Badge>;
    }
  };

  return (
    <Card onClick={onClick} className="flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
          {getRsvpBadge()}
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{formatEventTime(event.start_time)}</span>
            {event.end_time && (
              <span className="text-gray-400">- {formatEventTime(event.end_time)}</span>
            )}
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {event.total_cost > 0 && (
            <div className="text-sm font-medium text-primary-600">
              ${event.total_cost.toFixed(0)} total
            </div>
          )}
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 self-center" />
    </Card>
  );
}

export default function Schedule() {
  const navigate = useNavigate();
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
  });

  // Group events by date
  const groupedEvents = events?.reduce((acc, event) => {
    const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <>
      <Header title="Schedule" />

      <main className="px-4 py-4 max-w-lg mx-auto">
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 rounded-lg text-red-700 text-center">
            Failed to load schedule
          </div>
        )}

        {events?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No events scheduled yet</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        )}

        {groupedEvents && Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
          <div key={dateKey} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {formatEventDate(dayEvents[0].start_time)}
            </h2>
            <div className="space-y-3">
              {dayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => navigate(`/events/${event.id}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
