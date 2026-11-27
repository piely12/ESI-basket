/*
 * Abonnement aux notifications de matchs, côté navigateur.
 * Partagé par la carte des Réglages et le message du jour.
 */

export type Platform = 'ios' | 'android' | 'mac' | 'desktop'

export type EnableResult =
  | { ok: true; registration: ServiceWorkerRegistration }
  | { ok: false; reason: 'denied' | 'dismissed' | 'unavailable' | 'network' | 'rate-limited' | 'save-failed'; detail?: string }

export const PUSH_SYNC_KEY = 'lions-push-synced'
const READY_TIMEOUT = 10_000
const SUBSCRIBE_TIMEOUT = 20_000

/** Messages courts affichés à l’utilisateur selon l’issue de l’activation. */
export const ENABLE_MESSAGES: Record<Exclude<EnableResult, { ok: true }>['reason'] | 'timeout' | 'error', string> = {
  denied: 'Notifications bloquées dans ton navigateur.',
  dismissed: 'Choisis « Autoriser » pour continuer.',
  unavailable: 'Notifications indisponibles pour le moment.',
  network: 'Serveur injoignable. Réessaie.',
  'rate-limited': 'Trop de tentatives. Réessaie dans 1 h.',
  'save-failed': 'Échec de l’activation. Réessaie.',
  timeout: 'Ton navigateur ne répond pas. Réessaie.',
  error: 'Activation impossible. Recharge la page.',
}

export function decodeKey(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function sameKey(current: ArrayBuffer | null | undefined, expected: Uint8Array) {
  if (!current) return true
  const bytes = new Uint8Array(current)
  return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index])
}

export function withTimeout<T>(promise: Promise<T>, ms: number, code: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(code)), ms)),
  ])
}

export function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOs) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Macintosh/i.test(ua)) return 'mac'
  return 'desktop'
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function pushSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

/** Returns the active service worker registration, registering it if needed. */
export async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/')
  const registration = existing ?? await navigator.serviceWorker.register('/sw.js')
  if (registration.active) return registration
  return withTimeout(navigator.serviceWorker.ready, READY_TIMEOUT, 'sw-timeout')
}

export async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function saveSubscription(subscription: PushSubscription, url = '/api/push/subscriptions') {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
}

/**
 * Asks for permission (first, so it stays tied to the click as Safari and
 * Firefox require), subscribes this device and registers it on the server.
 * Timeouts are thrown as `Error('subscribe-timeout' | 'sw-timeout')`.
 */
export type EnableOptions = { saveUrl?: string; welcomeBody?: string; clickUrl?: string }

export async function enableMatchNotifications(options: EnableOptions = {}): Promise<EnableResult> {
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission === 'denied') return { ok: false, reason: 'denied' }
  if (permission !== 'granted') return { ok: false, reason: 'dismissed' }

  const registration = await getRegistration()
  const keyResponse = await fetch('/api/push/vapid-public-key').catch(() => null)
  if (!keyResponse?.ok) return { ok: false, reason: keyResponse?.status === 503 ? 'unavailable' : 'network' }
  const { publicKey } = await keyResponse.json() as { publicKey: string }
  const applicationServerKey = decodeKey(publicKey)

  let subscription = await registration.pushManager.getSubscription()
  if (subscription && !sameKey(subscription.options.applicationServerKey, applicationServerKey)) {
    await subscription.unsubscribe().catch(() => false)
    subscription = null
  }
  subscription ??= await withTimeout(
    registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }),
    SUBSCRIBE_TIMEOUT,
    'subscribe-timeout',
  )

  const saved = await saveSubscription(subscription, options.saveUrl).catch(() => null)
  if (!saved?.ok) {
    await subscription.unsubscribe().catch(() => false)
    if (saved?.status === 429) return { ok: false, reason: 'rate-limited' }
    // Shows the HTTP status and the server's error code so a screenshot is
    // enough to know what failed (e.g. « 503 · 42P01 » = table missing).
    const body = await saved?.json().catch(() => null) as { code?: string } | null
    const detail = saved ? [String(saved.status), body?.code].filter(Boolean).join(' · ') : 'réseau'
    return { ok: false, reason: 'save-failed', detail }
  }
  try { sessionStorage.setItem(PUSH_SYNC_KEY, '1') } catch { /* Storage unavailable. */ }

  await registration.showNotification('Notifications activées 🏀', {
    body: options.welcomeBody ?? 'Rappel à 11h chaque jour de match.',
    icon: '/icons/esi-192.png',
    badge: '/icons/esi-192.png',
    tag: 'lions-welcome',
    data: { url: options.clickUrl ?? '/matchs' },
  }).catch(() => undefined)
  return { ok: true, registration }
}

/** Short message for an exception thrown during activation. */
export function enableErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  return code === 'subscribe-timeout' || code === 'sw-timeout' ? ENABLE_MESSAGES.timeout : ENABLE_MESSAGES.error
}
