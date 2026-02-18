import { clsx } from 'clsx';

interface Attendee {
  id: string;
  display_name: string;
  photo_url: string | null;
}

interface AvatarStackProps {
  attendees: Attendee[];
  totalCount: number;
  maxDisplay?: number;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
};

export function AvatarStack({ attendees, totalCount, maxDisplay = 4, size = 'sm' }: AvatarStackProps) {
  const displayed = attendees.slice(0, maxDisplay);
  const overflow = totalCount - displayed.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {displayed.map((attendee) => (
          <div
            key={attendee.id}
            className={clsx(
              'rounded-full ring-2 ring-white dark:ring-gray-800 flex-shrink-0',
              sizeClasses[size]
            )}
          >
            {attendee.photo_url ? (
              <img
                src={attendee.photo_url}
                alt={attendee.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className={clsx(
                'w-full h-full rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium',
              )}>
                {attendee.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className={clsx(
              'rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium flex-shrink-0',
              sizeClasses[size]
            )}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
