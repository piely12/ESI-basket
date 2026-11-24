const CACHE_NAME = 'lions-esi-static-v2'
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

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data?.json() ?? {} } catch { payload = { body: event.data?.text() ?? '' } }
  event.waitUntil(self.registration.showNotification(payload.title || 'The Lions of ESI', {
    body: payload.body || 'Un match des Lions approche.',
    icon: '/icons/esi-192.png',
    badge: '/icons/esi-192.png',
    data: { url: payload.url || '/matchs' },
  }))
})

// The browser may rotate a push subscription (expiry, key refresh). Resubscribe
// with the same server key and register the new endpoint so reminders keep
// reaching this device; the old endpoint is removed on the server.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const options = event.oldSubscription?.options
    if (!options?.applicationServerKey) return
    const subscription = event.newSubscription
      || await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: options.applicationServerKey })
    await fetch('/api/push/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    })
    if (event.oldSubscription?.endpoint && event.oldSubscription.endpoint !== subscription.endpoint) {
      await fetch('/api/push/subscriptions', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: event.oldSubscription.endpoint }),
      })
    }
  })().catch(() => undefined))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/matchs', self.location.origin)
  if (target.origin !== self.location.origin) return
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => 'focus' in client)
    if (existing) {
      if ('navigate' in existing) void existing.navigate(target.href)
      return existing.focus()
    }
    return self.clients.openWindow(target.href)
  }))
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
