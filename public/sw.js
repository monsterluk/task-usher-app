// PlexiSystem Service Worker
const CACHE_NAME = 'plexisystem-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/worker',
  '/worker/history',
  '/worker/profile'
];

// API data cache for offline support
const API_CACHE = 'plexisystem-api-v1';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PlexiSystem: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!validCaches.includes(cacheName)) {
            console.log('PlexiSystem: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Handle API calls with network-first strategy and caching
  if (requestUrl.pathname.startsWith('/api/')) {
    // Only cache GET requests for API
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Network failed, try API cache
            return caches.match(event.request);
          })
      );
    }
    return;
  }

  // Handle static assets and pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response to store in cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // If no cache, return offline page for navigation
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nowe powiadomienie',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: data.url || '/',
      actions: [
        { action: 'open', title: 'Otwórz' },
        { action: 'close', title: 'Zamknij' }
      ]
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'PlexiSystem', options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});
