/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v2';

// Clean up old caches
cleanupOutdatedCaches();

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses with NetworkFirst strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: `api-cache-${CACHE_VERSION}`,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Cache images with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: `images-cache-${CACHE_VERSION}`,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Cache fonts with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: `fonts-cache-${CACHE_VERSION}`,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// Use StaleWhileRevalidate for static assets
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: `static-resources-${CACHE_VERSION}`,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        type: data.type || 'general',
      },
      tag: data.type || 'general',
      renotify: true,
      actions: [],
    };

    // Add contextual actions based on notification type
    if (data.type === 'schedule_change') {
      options.actions = [
        { action: 'view', title: 'View Schedule' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    } else if (data.type === 'payment_reminder') {
      options.actions = [
        { action: 'pay', title: 'View Payments' },
        { action: 'dismiss', title: 'Later' },
      ];
    } else if (data.type === 'event_reminder') {
      options.actions = [
        { action: 'view', title: 'View Event' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'BachBoys', options)
    );
  } catch (err) {
    console.error('Error showing notification:', err);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let targetUrl = '/';

  // Determine target URL based on action and notification type
  if (event.action === 'view' || event.action === '') {
    if (data.type === 'schedule_change' || data.type === 'event_reminder') {
      targetUrl = data.url || '/schedule';
    } else if (data.type === 'payment_reminder') {
      targetUrl = '/payments';
    } else {
      targetUrl = data.url || '/';
    }
  } else if (event.action === 'pay') {
    targetUrl = '/payments';
  } else if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // If no window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle push subscription change (when subscription expires or is revoked)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: (event as any).oldSubscription?.options?.applicationServerKey,
    }).then((subscription) => {
      // Re-register subscription with backend
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
    })
  );
});

// Handle offline fallback - show cached schedule if available
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For navigation requests, try network first, then show offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/') ?? await caches.match('/index.html');
        return cached ?? new Response(
          '<!DOCTYPE html><html><head><title>Offline</title></head><body style="font-family:system-ui;text-align:center;padding:50px"><h1>You\'re Offline</h1><p>Please check your connection and try again.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
  }
});

// Purge old versioned caches on activate, then claim clients
self.addEventListener('activate', (event) => {
  console.log('BachBoys Service Worker activated');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            // Keep workbox precache (has its own versioning)
            if (key.startsWith('workbox-precache')) return false;
            // Delete any runtime cache that doesn't end with current version
            return !key.endsWith(`-${CACHE_VERSION}`);
          })
          .map((key) => {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('install', () => {
  console.log('BachBoys Service Worker installed');
  self.skipWaiting();
});
