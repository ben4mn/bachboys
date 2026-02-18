import { useState } from 'react';
import { Bell, BellOff, AlertCircle, ChevronDown } from 'lucide-react';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export function NotificationSettings({ collapsible = false }: { collapsible?: boolean }) {
  const [open, setOpen] = useState(false);
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <BellOff className="w-5 h-5" />
          <div>
            <div className="font-medium">Notifications Not Supported</div>
            <div className="text-sm">Your browser doesn't support push notifications</div>
          </div>
        </div>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card className="bg-yellow-50 border-yellow-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-yellow-800">Notifications Blocked</div>
            <div className="text-sm text-yellow-700">
              You've blocked notifications for this site. To enable them, update your browser settings.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const content = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <BellOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
        )}
        <div>
          <div className="font-medium text-gray-900 dark:text-white">Push Notifications</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isSubscribed
              ? 'You\'ll receive alerts for schedule changes'
              : 'Get notified about important updates'}
          </div>
        </div>
      </div>

      {!collapsible && (
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isSubscribed
              ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : isSubscribed ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </button>
      )}
    </div>
  );

  if (!collapsible) {
    return (
      <Card>
        {content}
        {error && (
          <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">{error}</div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <BellOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-white">Push Notifications</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isSubscribed ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
              isSubscribed
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : isSubscribed ? (
              'Disable Notifications'
            ) : (
              'Enable Notifications'
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">{error}</div>
      )}
    </Card>
  );
}
