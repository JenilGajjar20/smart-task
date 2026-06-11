const CACHE_NAME = 'smarttask-cache-v6';

// Assets to cache immediately on SW install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json?v=6',
  '/favicon.jpg?v=6',
  '/icon-192.jpg?v=6',
  '/icon-512.jpg?v=6',
  '/maskable-icon.jpg?v=6'
];

// Install Event - Pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core offline assets (v6)');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning up old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Skip waiting notification update trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification Click Event - Opens the app or focuses it if already open
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close(); // Close the badge/alert banner

  // Get deep-link absolute URL inside PWA scope
  const targetUrl = new URL('/', self.location.origin).href;

  // Search for open window client of the PWA
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If a window client is already open, focus it
      for (const client of clientList) {
        if (client.url && client.url.startsWith(self.location.origin)) {
          if ('focus' in client) {
            return client.focus().then((focusedClient) => {
              // Post message to client so they can force-refresh or trigger UI action if needed
              if (focusedClient && 'postMessage' in focusedClient) {
                focusedClient.postMessage({ type: 'NOTIFICATION_CLICKED', taskId: notification.tag });
              }
              return focusedClient;
            });
          }
        }
      }
      // 2. If no window client is open, launch a new standalone client window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Fetch Event - Network-first with Cache fallback for general assets
// Cache-first for static resources (images, fonts, bundles)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip firestore operations, non-HTTP, and other external APIs
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Define strategy based on asset source
  // HTML documents & scripts: Network-first to ensure live updates
  if (request.mode === 'navigate' || request.destination === 'document' || request.destination === 'script') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Fallback for primary navigation if completely offline
            return caches.match('/');
          });
        })
    );
    return;
  }

  // Static assets (images, CSS styles, fonts): Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached, and asynchronously fetch newer in background
        fetch(request).then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
          }
        }).catch(() => {/* Ignore background sync failures */});
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      });
    })
  );
});
