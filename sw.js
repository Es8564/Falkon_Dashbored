/**
 * FALCON AI — Service Worker
 * Handles: app shell caching, offline fallback, file/image caching
 */

const CACHE_VERSION = 'falcon-v1';
const APP_SHELL_CACHE = CACHE_VERSION + '-shell';
const FILE_CACHE = CACHE_VERSION + '-files';

// App shell files to pre-cache on install
const APP_SHELL_FILES = [
  './',
  './COSTUMER_DASHBORED.html',
  './ADMIN_DASHBORED.html',
  './icon.svg',
  './manifest.json',
  './manifest_admin.json'
];

// Install: pre-cache the app shell
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(function (cache) {
      return cache.addAll(APP_SHELL_FILES).catch(function () {
        // Non-fatal: some files might not exist yet
        return Promise.resolve();
      });
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
        keys.filter(function (key) {
          return key.startsWith('falcon-') && key !== APP_SHELL_CACHE && key !== FILE_CACHE;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch strategy:
// - App shell (HTML/CSS/JS): Network-first, fall back to cache
// - API calls (google apps script): Network-only (never cache API responses)
// - Chat file data (data: URLs from chat_file_get): Cache after first load
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Never cache API calls to Google Apps Script
  if (url.hostname.includes('script.google') ||
      url.hostname.includes('googleusercontent') ||
      url.search.includes('command=')) {
    return; // Let the browser handle it normally
  }

  // For app shell files: network-first with cache fallback
  if (event.request.mode === 'navigate' ||
      APP_SHELL_FILES.some(function (f) { return url.pathname.endsWith(f.replace('./', '')); })) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        // Cache the fresh response
        var clone = response.clone();
        caches.open(APP_SHELL_CACHE).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        // Offline: serve from cache
        return caches.match(event.request).then(function (cached) {
          return cached || new Response('Offline — please reconnect to use Falcon AI.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
    );
    return;
  }

  // For everything else: cache-first (icons, fonts, etc.)
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(FILE_CACHE).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});

// Handle messages from the main thread (e.g., cache file data)
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'CACHE_FILE') {
    // Cache a file's base64 data for offline access
    var fileId = event.data.fileId;
    var data = event.data.data;
    if (fileId && data) {
      caches.open(FILE_CACHE).then(function (cache) {
        var response = new Response(JSON.stringify({ data: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
        cache.put('/_falcon_file_/' + fileId, response);
      });
    }
  }
});
