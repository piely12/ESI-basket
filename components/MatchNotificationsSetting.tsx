'use client'

import { useEffect, useState, type ReactNode } from 'react'

/*
 * Activation des notifications de matchs, sur mobile comme sur ordinateur.
 *
 * Cas pris en charge :
 * - Chrome, Edge, Firefox, Opera, Samsung Internet (Android et ordinateur) ;
 * - Safari sur Mac (macOS 13+) ;
 * - iPhone / iPad (iOS 16.4+) : uniquement depuis l'app ajoutée à l'écran
 *   d'accueil. Dans Safari, on affiche donc le guide d'installation.
 */

type Platform = 'ios' | 'android' | 'mac' | 'desktop'
type Status =
  | 'checking'
  | 'off'
  | 'on'
  | 'denied'
  | 'ios-install'
  | 'insecure'
  | 'unsupported'

const SYNC_KEY = 'lions-push-synced'
const READY_TIMEOUT = 10_000
const SUBSCRIBE_TIMEOUT = 20_000

function decodeKey(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function sameKey(current: ArrayBuffer | null | undefined, expected: Uint8Array) {
  if (!current) return true
  const bytes = new Uint8Array(current)
  return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index])
}

function withTimeout<T>(promise: Promise<T>, ms: number, code: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(code)), ms)),
  ])
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOs) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Macintosh/i.test(ua)) return 'mac'
  return 'desktop'
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function pushSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

/** Returns the active service worker registration, registering it if needed. */
async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/')
  const registration = existing ?? await navigator.serviceWorker.register('/sw.js')
  if (registration.active) return registration
  return withTimeout(navigator.serviceWorker.ready, READY_TIMEOUT, 'sw-timeout')
}

async function saveSubscription(subscription: PushSubscription) {
  return fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
}

function BellIcon({ className = 'size-5' }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function ShareIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="inline size-4 align-[-3px]">
    <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function Steps({ items }: { items: ReactNode[] }) {
  return <ol className="mt-3 space-y-2">
    {items.map((item, index) => <li key={index} className="flex gap-3 text-sm leading-snug text-[var(--ink)]">
      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold-deep">{index + 1}</span>
      <span className="pt-0.5">{item}</span>
    </li>)}
  </ol>
}

function unblockSteps(platform: Platform, standalone: boolean): ReactNode[] {
  if (platform === 'ios') return [
    <>Ouvre l’app <b>Réglages</b> de ton iPhone ou iPad.</>,
    <>Touche <b>Notifications</b>, puis <b>ESI BASKETBALL</b>.</>,
    <>Active <b>Autoriser les notifications</b>, puis reviens ici.</>,
  ]
  if (platform === 'android') return standalone ? [
    <>Fais un appui long sur l’icône <b>ESI BASKETBALL</b>, puis touche <b>ⓘ Infos sur l’appli</b>.</>,
    <>Touche <b>Notifications</b> et active-les.</>,
    <>Reviens ici et touche <b>Activer les notifications</b>.</>,
  ] : [
    <>Touche l’icône à gauche de l’adresse du site (cadenas ou réglages).</>,
    <>Touche <b>Autorisations</b> puis <b>Notifications</b>, et choisis <b>Autoriser</b>.</>,
    <>Recharge la page, puis touche <b>Activer les notifications</b>.</>,
  ]
  if (platform === 'mac' && /Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Firefox/i.test(navigator.userAgent)) return [
    <>Dans la barre de menus, ouvre <b>Safari › Réglages</b>, onglet <b>Sites web</b>.</>,
    <>Dans <b>Notifications</b>, choisis <b>Autoriser</b> pour ce site.</>,
    <>Recharge la page, puis clique sur <b>Activer les notifications</b>.</>,
  ]
  return [
    <>Clique sur l’icône à gauche de l’adresse du site (cadenas ou réglages).</>,
    <>Dans <b>Notifications</b>, choisis <b>Autoriser</b>.</>,
    <>Recharge la page, puis clique sur <b>Activer les notifications</b>.</>,
  ]
}

export default function MatchNotificationsSetting() {
  const [status, setStatus] = useState<Status>('checking')
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [standalone, setStandalone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      const currentPlatform = detectPlatform()
      const installed = isStandalone()
      if (!active) return
      setPlatform(currentPlatform)
      setStandalone(installed)

      if (!window.isSecureContext) return setStatus('insecure')
      if (!pushSupported()) return setStatus(currentPlatform === 'ios' && !installed ? 'ios-install' : 'unsupported')
      if (Notification.permission === 'denied') return setStatus('denied')

      try {
        const registration = await navigator.serviceWorker.getRegistration('/')
        const subscription = await registration?.pushManager.getSubscription()
        if (!active) return
        if (subscription && Notification.permission === 'granted') {
          setStatus('on')
          // Re-sends the subscription once per session so the server always
          // knows this device, even after a server-side cleanup.
          let synced = false
          try { synced = sessionStorage.getItem(SYNC_KEY) === '1' } catch { /* Storage unavailable. */ }
          if (!synced) {
            const saved = await saveSubscription(subscription).catch(() => null)
            if (saved?.ok) try { sessionStorage.setItem(SYNC_KEY, '1') } catch { /* Storage unavailable. */ }
          }
        } else {
          setStatus('off')
        }
      } catch {
        if (active) setStatus('off')
      }
    })
    return () => { active = false }
  }, [])

  async function enable() {
    // Safari and Firefox require the permission prompt to start directly from
    // the click, so it is requested before any other asynchronous work.
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission === 'denied') {
      setStatus('denied')
      return
    }
    if (permission !== 'granted') {
      setFeedback({ tone: 'error', text: 'Tu n’as pas encore autorisé les notifications. Touche à nouveau le bouton et choisis « Autoriser ».' })
      return
    }

    const registration = await getRegistration()
    const keyResponse = await fetch('/api/push/vapid-public-key')
    if (!keyResponse.ok) {
      setFeedback({ tone: 'error', text: keyResponse.status === 503
        ? 'Le service de notifications n’est pas encore configuré. Réessaie plus tard.'
        : 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.' })
      return
    }
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

    const saved = await saveSubscription(subscription)
    if (!saved.ok) {
      await subscription.unsubscribe().catch(() => false)
      setFeedback({ tone: 'error', text: saved.status === 429
        ? 'Trop de tentatives depuis cet appareil. Réessaie dans une heure.'
        : 'Ton abonnement n’a pas pu être enregistré. Réessaie dans quelques instants.' })
      return
    }
    try { sessionStorage.setItem(SYNC_KEY, '1') } catch { /* Storage unavailable. */ }

    setStatus('on')
    setFeedback({ tone: 'ok', text: 'C’est activé ! Tu recevras un rappel à 11h le jour de chaque match des Lions sur cet appareil.' })
    await registration.showNotification('Notifications activées 🏀', {
      body: 'Tu seras prévenu à 11h le jour de chaque match des Lions.',
      icon: '/icons/esi-192.png',
      badge: '/icons/esi-192.png',
      tag: 'lions-welcome',
      data: { url: '/matchs' },
    }).catch(() => undefined)
  }

  async function disable() {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe().catch(() => false)
      await fetch('/api/push/subscriptions', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => null)
    }
    try { sessionStorage.removeItem(SYNC_KEY) } catch { /* Storage unavailable. */ }
    setStatus('off')
    setFeedback({ tone: 'ok', text: 'Les notifications sont désactivées sur cet appareil.' })
  }

  async function sendTest() {
    setFeedback(null)
    try {
      const registration = await getRegistration()
      await registration.showNotification('Test réussi ✅', {
        body: 'Les notifications des Lions fonctionnent sur cet appareil.',
        icon: '/icons/esi-192.png',
        badge: '/icons/esi-192.png',
        tag: 'lions-test',
        data: { url: '/matchs' },
      })
      setFeedback({ tone: 'ok', text: 'Notification de test envoyée. Si elle n’apparaît pas, vérifie le mode « Ne pas déranger » ou « Concentration » de ton appareil.' })
    } catch {
      setFeedback({ tone: 'error', text: 'La notification de test n’a pas pu être affichée sur cet appareil.' })
    }
  }

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setFeedback(null)
    try {
      await action()
    } catch (error) {
      console.error('[push] Action failed', error)
      const code = error instanceof Error ? error.message : ''
      if ('Notification' in window && Notification.permission === 'denied') setStatus('denied')
      else setFeedback({ tone: 'error', text: code === 'subscribe-timeout' || code === 'sw-timeout'
        ? 'Le service de notifications de ton navigateur ne répond pas. Vérifie ta connexion, puis réessaie. Sur Brave, active « Utiliser les services Google pour la messagerie push » dans les réglages.'
        : 'Ton navigateur n’a pas pu activer les notifications. Recharge la page et réessaie.' })
    } finally {
      setBusy(false)
    }
  }

  const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50'

  return <section className="settings-card theme-card rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5" aria-labelledby="match-notifications-title">
    <div className="flex items-center gap-3.5">
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold-deep">
        <BellIcon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="match-notifications-title" className="settings-card-title">Notifications de matchs</h2>
          {status === 'on' && <span className="rounded-full border border-success-border bg-success-bg px-2 py-0.5 text-xs font-bold text-success">Activées</span>}
        </div>
        <p className="settings-card-description mt-1">Un rappel à 11h le jour de chaque match des Lions, avec la composition d’équipe, sur ton téléphone comme sur ton ordinateur.</p>
      </div>
    </div>

    {(status === 'off' || status === 'checking') && <button type="button" disabled={busy || status === 'checking'} onClick={() => void run(enable)}
      className={`${buttonClass} mt-4 w-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 sm:w-auto`}>
      <BellIcon />
      {busy ? 'Activation…' : 'Activer les notifications'}
    </button>}

    {status === 'on' && <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <button type="button" disabled={busy} onClick={() => void run(sendTest)}
        className={`${buttonClass} border border-[var(--line)] bg-transparent text-[var(--ink)] hover:border-[var(--line-strong)]`}>
        Envoyer une notification test
      </button>
      <button type="button" disabled={busy} onClick={() => void run(disable)}
        className={`${buttonClass} text-[var(--ink-soft)] hover:text-[var(--ink)]`}>
        {busy ? 'Un instant…' : 'Désactiver'}
      </button>
    </div>}

    {status === 'ios-install' && <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3.5">
      <p className="text-sm font-semibold text-[var(--ink)]">Sur iPhone et iPad, les notifications passent par l’app installée :</p>
      <Steps items={[
        <>Dans Safari, touche le bouton <b>Partager</b> <ShareIcon />.</>,
        <>Choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.</>,
        <>Ouvre <b>ESI BASKETBALL</b> depuis ton écran d’accueil, va dans <b>Réglages</b> et touche <b>Activer les notifications</b>.</>,
      ]} />
      <p className="mt-3 text-xs text-[var(--ink-soft)]">Nécessite iOS ou iPadOS 16.4 ou plus récent.</p>
    </div>}

    {status === 'denied' && <div className="mt-4 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5">
      <p className="text-sm font-semibold text-[var(--ink)]">Les notifications sont bloquées pour ce site. Pour les débloquer :</p>
      <Steps items={unblockSteps(platform, standalone)} />
    </div>}

    {status === 'insecure' && <p className="mt-3 text-sm text-[var(--ink-soft)]">Les notifications nécessitent une connexion sécurisée (HTTPS).</p>}
    {status === 'unsupported' && <p className="mt-3 text-sm text-[var(--ink-soft)]">
      Ce navigateur ne prend pas en charge les notifications. Utilise Chrome, Edge, Firefox ou Safari à jour{platform === 'ios' ? ', depuis l’app ajoutée à l’écran d’accueil' : ''}.
    </p>}

    {feedback && <p role="status" aria-live="polite" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${feedback.tone === 'ok'
      ? 'border-success-border bg-success-bg text-[var(--ink)]'
      : 'border-danger-border bg-danger-bg text-[var(--ink)]'}`}>{feedback.text}</p>}
  </section>
}
