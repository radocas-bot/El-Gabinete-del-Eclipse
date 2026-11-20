/* ==========================================================================
   sw.js — Resilient Offline-First Service Worker for El Gabinete del Eclipse
   ========================================================================== */
'use strict';

const CACHE_NAME = 'eclipse-3d-v2';

const PRECACHE_ASSETS = [
  './index.html',
  './styles.css',
  './manifest.json',
  './manifest.webmanifest',
  './vendor/three-bundle.js',
  './src/core/state.js',
  './src/core/audio.js',
  './src/core/textures.js',
  './src/core/materials.js',
  './src/core/camera.js',
  './src/room/architecture.js',
  './src/room/props.js',
  './src/room/stations/door.js',
  './src/room/stations/clockBooks.js',
  './src/room/stations/desk.js',
  './src/room/stations/optics.js',
  './src/room/stations/telemetry.js',
  './src/room/stations/orrery.js',
  './src/ui/hints.js',
  './src/ui/journal.js',
  './src/ui/inspector.js',
  './src/ui/hud.js',
  './src/ui/screens.js',
  './src/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Cache each asset individually so a single redirect/host quirk never aborts SW install
      return Promise.allSettled(
        PRECACHE_ASSETS.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function () {
            return cache.add(url).catch(function () { return null; });
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(req).then(function (networkRes) {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, clone);
          }).catch(function () {});
        }
        return networkRes;
      }).catch(function () {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
