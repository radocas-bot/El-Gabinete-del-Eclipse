/* ==========================================================================
   sw.js — Hybrid Network-First / Cache-First Service Worker (PWA Offline)
   ========================================================================== */
'use strict';

const CACHE_NAME = 'eclipse-3d-v3';

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

// Heavy static vendor/icon assets use Cache-First; app code (HTML/CSS/JS/JSON) uses Network-First
function isStaticCacheFirst(pathname) {
  return (
    pathname.indexOf('/vendor/') !== -1 ||
    pathname.indexOf('/icons/') !== -1 ||
    /\.(png|jpg|jpeg|webp|ico|woff2?)$/i.test(pathname)
  );
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
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

  // 1. Cache-First for heavy immutable vendor bundle & icons
  if (isStaticCacheFirst(url.pathname)) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (networkRes) {
          if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, clone);
            }).catch(function () {});
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // 2. Network-First for HTML, CSS, JS, JSON & navigations (instant updates on re-upload, full offline fallback)
  event.respondWith(
    fetch(req).then(function (networkRes) {
      if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
        const clone = networkRes.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(req, clone);
        }).catch(function () {});
      }
      return networkRes;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return caches.match('./index.html', { ignoreSearch: true });
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
