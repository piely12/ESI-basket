'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  ENABLE_MESSAGES,
  PUSH_SYNC_KEY as SYNC_KEY,
  detectPlatform,
  enableErrorMessage,
  enableMatchNotifications,
  isStandalone,
  pushSupported,
  saveSubscription,
  type Platform,
} from '@/lib/push/client'

/*
 * Activation des notifications de matchs, sur mobile comme sur ordinateur.
 *
 * Cas pris en charge :
 * - Chrome, Edge, Firefox, Opera, Samsung Internet (Android et ordinateur) ;
 * - Safari sur Mac (macOS 13+) ;
 * - iPhone / iPad (iOS 16.4+) : uniquement depuis l'app ajoutée à l'écran
 *   d'accueil. Dans Safari, on affiche donc le guide d'installation.
 */

type Status =
  | 'checking'
  | 'off'
  | 'on'
  | 'denied'
  | 'ios-install'
  | 'insecure'
  | 'unsupported'

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
    <><b>Réglages</b> › <b>Notifications</b> › <b>ESI BASKETBALL</b></>,
    <>Active <b>Autoriser les notifications</b></>,
  ]
  if (platform === 'android') return standalone ? [
    <>Appui long sur l’icône › <b>Infos sur l’appli</b></>,
    <><b>Notifications</b> › Activer</>,
  ] : [
    <>Touche le cadenas à gauche de l’adresse</>,
    <><b>Notifications</b> › <b>Autoriser</b>, puis recharge</>,
  ]
  if (platform === 'mac' && /Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Firefox/i.test(navigator.userAgent)) return [
    <><b>Safari</b> › <b>Réglages</b> › <b>Sites web</b> › <b>Notifications</b></>,
    <>Choisis <b>Autoriser</b>, puis recharge</>,
  ]
  return [
    <>Clique sur le cadenas à gauche de l’adresse</>,
    <><b>Notifications</b> › <b>Autoriser</b>, puis recharge</>,
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
    const result = await enableMatchNotifications()
    if (result.ok) {
      setStatus('on')
      setFeedback({ tone: 'ok', text: 'Notifications activées ✅' })
    } else if (result.reason === 'denied') {
      setStatus('denied')
    } else {
      setFeedback({ tone: 'error', text: ENABLE_MESSAGES[result.reason] + (result.detail ? ` (${result.detail})` : '') })
    }
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
    setFeedback({ tone: 'ok', text: 'Notifications désactivées.' })
  }

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setFeedback(null)
    try {
      await action()
    } catch (error) {
      console.error('[push] Action failed', error)
      if ('Notification' in window && Notification.permission === 'denied') setStatus('denied')
      else setFeedback({ tone: 'error', text: enableErrorMessage(error) })
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
        <p className="settings-card-description mt-1">Active les notifications pour ne pas manquer les actualités des Lions de l’ESI Basket.</p>
      </div>
    </div>

    {(status === 'off' || status === 'checking') && <button type="button" disabled={busy || status === 'checking'} onClick={() => void run(enable)}
      className={`${buttonClass} mt-4 w-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 sm:w-auto`}>
      <BellIcon />
      {busy ? 'Activation…' : 'Activer les notifications'}
    </button>}

    {status === 'on' && <button type="button" disabled={busy} onClick={() => void run(disable)}
      className={`${buttonClass} mt-4 w-full border border-[var(--line)] bg-transparent text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:text-[var(--ink)] sm:w-auto`}>
      {busy ? 'Un instant…' : 'Désactiver les notifications'}
    </button>}

    {status === 'ios-install' && <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3.5">
      <p className="text-sm font-semibold text-[var(--ink)]">Sur iPhone, installe d’abord l’app :</p>
      <Steps items={[
        <>Touche <b>Partager</b> <ShareIcon /> › <b>Sur l’écran d’accueil</b></>,
        <>Ouvre l’app › <b>Réglages</b> › <b>Activer</b></>,
      ]} />
      <p className="mt-3 text-xs text-[var(--ink-soft)]">iOS 16.4 minimum.</p>
    </div>}

    {status === 'denied' && <div className="mt-4 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5">
      <p className="text-sm font-semibold text-[var(--ink)]">Notifications bloquées. Pour les débloquer :</p>
      <Steps items={unblockSteps(platform, standalone)} />
    </div>}

    {status === 'insecure' && <p className="mt-3 text-sm text-[var(--ink-soft)]">Connexion sécurisée (HTTPS) requise.</p>}
    {status === 'unsupported' && <p className="mt-3 text-sm text-[var(--ink-soft)]">Navigateur non compatible. Essaie Chrome, Edge, Firefox ou Safari.</p>}

    {feedback && <p role="status" aria-live="polite" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${feedback.tone === 'ok'
      ? 'border-success-border bg-success-bg text-[var(--ink)]'
      : 'border-danger-border bg-danger-bg text-[var(--ink)]'}`}>{feedback.text}</p>}
  </section>
}
