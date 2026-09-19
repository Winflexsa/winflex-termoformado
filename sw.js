/* Winflex · Termoformado — service worker
   Estrategia: la red manda. El cache es solo para poder abrir la app sin
   conexion. Asi nadie queda mirando una version vieja despues de un deploy. */

const CACHE = 'termoformado-v1';
const BASE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Nunca cachear la sincronizacion: los datos siempre van a la red. */
  if (url.hostname.indexOf('jsonbin.io') !== -1) return;

  /* La version de tablet no se toca: sigue yendo directo a la red como siempre. */
  if (url.pathname.endsWith('tablet.html')) return;

  /* Todo lo demas: red primero, cache como respaldo. */
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && url.origin === location.origin) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
