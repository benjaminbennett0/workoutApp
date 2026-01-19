const CACHE_NAME = 'workout-v1.1.1';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces the new service worker to take over immediately
});

self.addEventListener('activate', (event) => {
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
  // Pass-through to network to ensure we always get fresh data
  event.respondWith(fetch(event.request));
});
