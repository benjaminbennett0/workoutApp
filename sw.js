const CACHE_NAME = 'workout-v1.0.4';

self.addEventListener('install', (event) => {
  // Force the new service worker to become active immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now
  event.respondWith(fetch(event.request));
});
