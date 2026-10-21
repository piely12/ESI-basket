const CACHE_NAME = 'lions-esi-static-v1'
const OFFLINE_URL = '/hors-ligne'
const PRECACHE_URLS = [OFFLINE_URL, '/icons/esi-192.png', '/icons/esi-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('lions-esi-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()))
    return
  }

  const staticResource = url.pathname.startsWith('/_next/static/')
    || /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname)
  if (!staticResource || url.pathname.startsWith('/_next/image')) return

  event.respondWith(fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
    }
    return response
  }).catch(async () => (await caches.match(request)) || Response.error()))
})
