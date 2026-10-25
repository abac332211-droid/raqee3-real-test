/* ============ Sprint 7.2 — Service Worker (Final) ============ */
const CACHE = 'raqee3-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // addAll ذرّي: فشل ملف واحد يُسقِط التثبيت كاملاً.
      // نضيف كل ملف منفرداً — فشل الأيقونة لا يمنع كاش HTML/SW.
      Promise.all(
        ASSETS.map((url) =>
          c.add(url).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err.message);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('raqee3-') && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          // fallback آمن: جرّب index.html ثم الجذر ثم 503
          caches.match('./index.html')
            .then((r) => r || caches.match('./'))
            .then((r) => r || new Response('Offline', { status: 503, statusText: 'Offline' }))
        );
    })
  );
});