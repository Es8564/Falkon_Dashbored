// FALCON AI — Service Worker
// Enables PWA install on both Customer Dashboard and Admin Dashboard.
// Strategy: Cache-first for static assets, network-first for GAS API calls.

const CACHE_NAME = 'falcon-ai-v2';

// Files to pre-cache on install (core shell)
const PRECACHE_URLS = [
  './DASHBORED.html',
  './ADMIN_DASHBORED.html',
  './admin-console.html',
  './manifest.json',
  './manifest_admin.json',
  './manifest_admin_console.json',
  './icon.svg'
];

// Install: pre-cache the app shell
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Always go network-first for Google Apps Script API calls
  if (url.indexOf('script.google.com') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return new Response(JSON.stringify({ status: 'error', message: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, toCache);
        });
        return response;
      });
    })
  );
});