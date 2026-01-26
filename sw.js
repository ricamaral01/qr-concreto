// CONCRETRACK — SW com cache diário
const PREFIX = "concretrack-cache-";
const TODAY = new Date().toISOString().slice(0,10).replaceAll("-",""); // YYYYMMDD
const CACHE = `${PREFIX}${TODAY}`;

// coloque aqui tudo que você quer cachear
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",

  // ícones principais do PWA
  "./assets/icon-192x192.png",
  "./assets/icon-256x256.png",
  "./assets/icon-384x384.png",
  "./assets/icon-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith(PREFIX) && k !== CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Estratégia:
// - HTML/manifest/sw: network-first (pega atualização quando existir)
// - demais: cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return; // não intercepta CDN do html5-qrcode

  const isCore =
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/manifest.json") ||
    url.pathname.endsWith("/sw.js") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/");

  if (isCore) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
