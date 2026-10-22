'use client'

import { useEffect, useState } from 'react'

function decodeKey(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function BellIcon({ className = 'size-5' }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

export default function MatchNotificationsSetting() {
  const [supported] = useState(() => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!supported) return
    void navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription))).catch(() => setEnabled(false))
  }, [supported])

  async function toggle() {
    if (busy || !supported) return
    setBusy(true)
    setFeedback('')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await fetch('/api/push/subscriptions', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint }) })
        setEnabled(false)
        setFeedback('Notifications désactivées sur cet appareil.')
        return
      }

      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
      if (permission !== 'granted') {
        setFeedback('Les notifications sont bloquées. Autorise-les dans les réglages du site de ton navigateur, puis réessaie.')
        return
      }

      const keyResponse = await fetch('/api/push/vapid-public-key')
      if (!keyResponse.ok) throw new Error('configuration')
      const { publicKey } = await keyResponse.json() as { publicKey: string }
      const created = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) })
      const saved = await fetch('/api/push/subscriptions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(created.toJSON()) })
      if (!saved.ok) {
        await created.unsubscribe()
        throw new Error('save')
      }
      setEnabled(true)
      setFeedback('Tu recevras le samedi à 11 h le programme des matchs ESI prévus ce jour-là.')
    } catch {
      setFeedback('Impossible de configurer les notifications pour le moment. Réessaie plus tard.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="settings-card theme-card flex items-center gap-3.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
    <div className="min-w-0 flex-1">
      <h2 className="settings-card-title">Notifications de matchs</h2>
      <p className="settings-card-description mt-1">Autorise les notifications pour recevoir le samedi à 11 h le programme des matchs ESI prévus ce jour-là.</p>
      {feedback && <p role="status" className="mt-2 text-sm text-muted-foreground">{feedback}</p>}
      {!supported && <p className="mt-2 text-sm text-muted-foreground">Les notifications push ne sont pas disponibles sur ce navigateur.</p>}
    </div>
    <button type="button" aria-pressed={enabled} aria-label={enabled ? 'Désactiver les notifications de matchs' : 'Activer les notifications de matchs'} title={enabled ? 'Désactiver les notifications' : 'Activer les notifications'} disabled={!supported || busy} onClick={toggle} className={`grid size-11 shrink-0 place-items-center rounded-xl border border-gold bg-gold text-gold-foreground transition-all hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'shadow-md ring-2 ring-gold/35' : 'shadow-sm'}`}>
      <BellIcon />
    </button>
  </section>
}
