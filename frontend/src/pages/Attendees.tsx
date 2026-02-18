import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, AtSign, Crown, Shield, ChevronDown, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Header } from '../components/shared/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { LinkedText } from '../components/shared/LinkedText';
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

function saveAsContact(user: User) {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${user.display_name}`,
  ];

  // Split display name into first/last for N field
  const parts = user.display_name.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  lines.push(`N:${lastName};${firstName};;;`);

  if (user.phone) {
    lines.push(`TEL;TYPE=CELL:${user.phone}`);
  }

  if (user.venmo_handle) {
    const handle = user.venmo_handle.replace(/^@/, '');
    lines.push(`URL:https://venmo.com/${handle}`);
    const notesParts: string[] = [`Venmo: @${handle}`];
    if (user.bio) notesParts.push(user.bio);
    lines.push(`NOTE:${notesParts.join('\\n')}`);
  } else if (user.bio) {
    lines.push(`NOTE:${user.bio}`);
  }

  // Include photo if it's a base64 data URL
  if (user.photo_url?.startsWith('data:image/')) {
    const match = user.photo_url.match(/^data:image\/(\w+);base64,(.+)$/);
    if (match) {
      const type = match[1].toUpperCase();
      const base64 = match[2];
      // vCard 3.0 PHOTO with inline base64 — fold long lines at 75 chars
      const photoLine = `PHOTO;ENCODING=b;TYPE=${type}:${base64}`;
      // Fold per RFC 2425: first line normal, continuation lines start with space
      const folded: string[] = [];
      for (let i = 0; i < photoLine.length; i += 75) {
        folded.push((i === 0 ? '' : ' ') + photoLine.slice(i, i + 75));
      }
      lines.push(folded.join('\r\n'));
    }
  }

  lines.push('END:VCARD');

  const vcf = lines.join('\r\n');
  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${user.display_name.replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AttendeeCard({
  user,
  isExpanded,
  onToggle,
}: {
  user: User;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const bioRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = bioRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [user.bio]);

  const expandable = !!user.bio && isClamped;

  return (
    <Card onClick={expandable ? onToggle : undefined}>
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
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{user.display_name}</h3>
            {user.is_admin && (
              <Shield className="w-4 h-4 text-primary-600" />
            )}
            {expandable && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </motion.div>
            )}
          </div>

          <div className="mt-1">
            {getTripStatusBadge(user.trip_status)}
          </div>

          {user.bio && (
            <p
              ref={bioRef}
              className={`mt-2 text-sm text-gray-600 dark:text-gray-400 ${isExpanded ? '' : 'line-clamp-2'}`}
            >
              <LinkedText text={user.bio} />
            </p>
          )}

          {/* Contact Info */}
          <div className="mt-3 flex flex-wrap gap-3">
            {user.phone && (
              <a
                href={`tel:${user.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400"
              >
                <Phone className="w-4 h-4" />
                {user.phone}
              </a>
            )}
            {user.venmo_handle && (
              <a
                href={`https://venmo.com/${user.venmo_handle.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400"
              >
                <AtSign className="w-4 h-4" />
                {user.venmo_handle.replace(/^@/, '')}
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); saveAsContact(user); }}
              className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              <UserPlus className="w-4 h-4" />
              Save Contact
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Attendees() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
          <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-center">
            Failed to load attendees
          </div>
        )}

        {!isLoading && sortedUsers && (
          <>
            {/* Stats */}
            <div className="mb-4 text-center">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{confirmedCount}</span>
              <span className="text-gray-600 dark:text-gray-400 ml-2">
                {confirmedCount === 1 ? 'person' : 'people'} confirmed
              </span>
            </div>

            {/* Attendee List */}
            <div className="space-y-3">
              {sortedUsers.map((user) => (
                <AttendeeCard
                  key={user.id}
                  user={user}
                  isExpanded={expandedId === user.id}
                  onToggle={() => setExpandedId(expandedId === user.id ? null : user.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
