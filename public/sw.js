/// <reference lib="webworker" />

const CACHE_NAME = 'idm-meta-v1';
var STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/assets/idm-logo.png',
];

// Install — cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function() {
        // Silently fail for assets that aren't available yet
      });
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network first, fallback to cache
self.addEventListener('fetch', function(event) {
  var request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls, external requests, and chrome-extension URLs
  if (
    request.url.includes('/api/') ||
    request.url.includes('XTransformPort') ||
    request.url.startsWith('chrome-extension://') ||
    request.url.startsWith('chrome://') ||
    (request.url.startsWith('http') && !request.url.includes(self.location.origin))
  ) return;

  event.respondWith(
    fetch(request)
      .then(function(response) {
        // Cache successful responses
        if (response.ok) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, responseClone).catch(function() {
              // Ignore cache errors
            });
          });
        }
        return response;
      })
      .catch(function() {
        // Fallback to cache
        return caches.match(request).then(function(cached) {
          if (cached) return cached;
          // Fallback to index for navigation
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
