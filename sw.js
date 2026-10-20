// Service worker (PWA, Hito 9): guarda el código de la app para usarla sin conexión e instalarla.
// Solo archivos de la app (nunca fotos: no pasan por la red). Red primero, para que los cambios se vean;
// si no hay servidor, sirve lo guardado. Su CSP propia permite connect-src 'self' (ver scripts/serve.js).
"use strict";
const CACHE = "espejo-v3";
const SHELL = [
  "./", "index.html", "styles.css", "manifest.webmanifest",
  "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png",
  "core/ops.js", "core/mask.js", "core/png.js",
  "core/asesor.js", "core/color.js", "core/dibujos.js", "core/estilo.js", "core/piel.js", "core/ficha.js",
  "core/pelo.js", "ui/app.js", "ui/mp.js", "ui/cara.js", "ui/color.js", "ui/estilo.js", "ui/probador.js", "ui/pelo.js", "ui/piel.js", "ui/resumen.js",
];
// El modelo de cara (~18 MB) se guarda la primera vez que se usa, no al instalar.

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req)
    .then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })
    .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error())));
});
