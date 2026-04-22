// Service Worker stub — prevents 404 errors in the console.
// No caching or offline functionality is configured at this time.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
