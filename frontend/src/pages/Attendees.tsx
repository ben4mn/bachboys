import { useQuery } from '@tanstack/react-query';
import { Phone, AtSign, Crown, Shield } from 'lucide-react';
import { Header } from '../components/shared/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { getUsers } from '../api/users';
import type { User, TripStatus } from '../types';

function getTripStatusBadge(status: TripStatus) {
  switch (status) {
    case 'confirmed':
      return <Badge variant="success">Confirmed</Badge>;
    case 'declined':
      return <Badge variant="error">Not Going</Badge>;
    case 'maybe':
      return <Badge variant="warning">Maybe</Badge>;
    default:
      return <Badge variant="default">Invited</Badge>;
  }
}

function AttendeeCard({ user }: { user: User }) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt={user.display_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          {user.is_groom && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <Crown className="w-4 h-4 text-yellow-800" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{user.display_name}</h3>
            {user.is_admin && (
              <Shield className="w-4 h-4 text-primary-600" />
            )}
          </div>

          <div className="mt-1">
            {getTripStatusBadge(user.trip_status)}
          </div>

          {user.bio && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{user.bio}</p>
          )}

          {/* Contact Info */}
          <div className="mt-3 flex flex-wrap gap-3">
            {user.phone && (
              <a
                href={`tel:${user.phone}`}
                className="flex items-center gap-1.5 text-sm text-primary-600"
              >
                <Phone className="w-4 h-4" />
                {user.phone}
              </a>
            )}
            {user.venmo_handle && (
              <a
                href={`https://venmo.com/${user.venmo_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary-600"
              >
                <AtSign className="w-4 h-4" />
                {user.venmo_handle}
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Attendees() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  // Sort: groom first, then confirmed, then by name
  const sortedUsers = users?.slice().sort((a, b) => {
    if (a.is_groom) return -1;
    if (b.is_groom) return 1;
    if (a.trip_status === 'confirmed' && b.trip_status !== 'confirmed') return -1;
    if (b.trip_status === 'confirmed' && a.trip_status !== 'confirmed') return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  const confirmedCount = users?.filter((u) => u.trip_status === 'confirmed').length || 0;

  return (
    <>
      <Header title="The Crew" />

      <main className="px-4 py-4 max-w-lg mx-auto">
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 rounded-lg text-red-700 text-center">
            Failed to load attendees
          </div>
        )}

        {!isLoading && sortedUsers && (
          <>
            {/* Stats */}
            <div className="mb-4 text-center">
              <span className="text-2xl font-bold text-primary-600">{confirmedCount}</span>
              <span className="text-gray-600 ml-2">
                {confirmedCount === 1 ? 'person' : 'people'} confirmed
              </span>
            </div>

            {/* Attendee List */}
            <div className="space-y-3">
              {sortedUsers.map((user) => (
                <AttendeeCard key={user.id} user={user} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
