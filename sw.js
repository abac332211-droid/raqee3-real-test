/* Raqee3 v8.0.0 — Service Worker
 * Navigation: Network First.
 * Explicit static PWA assets: Cache First.
 * Offline HTML fallback is navigation-only.
 */
'use strict';

const CACHE_PREFIX = 'raqee3-';
const CACHE_NAME = 'raqee3-v8.0.0';
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const PRECACHE_ABSOLUTE_URLS = PRECACHE_URLS.map(
  (path) => new URL(path, self.registration.scope).href
);
const PRECACHE_SET = new Set(PRECACHE_ABSOLUTE_URLS);
const APP_SHELL_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // No skipWaiting(): let the old version finish controlling open tabs.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(APP_SHELL_URL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(APP_SHELL_URL);
    if (cached) return cached;

    return new Response(
      '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>رقيع المطور</title><body style="font-family:system-ui;padding:2rem">' +
      '<h2>لا يوجد اتصال بالإنترنت</h2><p>تعذر تحميل التطبيق ولا توجد نسخة محفوظة.</p>' +
      '</body></html>',
      {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Only explicitly listed same-origin PWA files are cache-managed.
  url.search = '';
  url.hash = '';
  if (!PRECACHE_SET.has(url.href)) return;

  event.respondWith(handleStaticAsset(request));
});
