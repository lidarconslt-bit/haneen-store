/* حنين — service worker بسيط.
   السياسة: الشبكة أولًا دائمًا، والذاكرة احتياط عند انقطاع الاتصال فقط.
   السبب: الأسعار وبيانات التحويل يجب ألا تُعرض من نسخة قديمة أبدًا. */

var CACHE = 'haneen-v13';
var SHELL = [
  './',
  './index.html',
  './config.json',
  './assets/css/style.css',
  './assets/js/app.js',
  './manifest.webmanifest',
  './assets/icons/icon-192.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .catch(function () { /* تجاهل فشل ملف مفقود */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return; /* الخطوط وApps Script تمر مباشرة */

  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
  );
});
