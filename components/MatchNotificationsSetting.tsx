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
  const [supported, setSupported] = useState(false)
  const [supportMessage, setSupportMessage] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      const isSupported = window.isSecureContext
        && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
      if (!active) return
      setSupported(isSupported)
      if (!isSupported) {
        if (!window.isSecureContext) setSupportMessage('Les notifications nécessitent une connexion sécurisée HTTPS.')
        else if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setSupportMessage('Les notifications push ne sont pas disponibles ici. Sur iPhone ou iPad, ouvre l’application depuis l’écran d’accueil.')
        } else setSupportMessage('Ce navigateur ne prend pas en charge les notifications.')
        return
      }
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (active) setEnabled(Boolean(subscription))
      } catch {
        if (active) setEnabled(false)
      }
    })
    return () => { active = false }
  }, [])

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
        const removed = await fetch('/api/push/subscriptions', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
        setEnabled(false)
        setFeedback(removed.ok
          ? 'Les notifications sont désactivées sur cet appareil.'
          : 'Les notifications sont désactivées sur cet appareil. Le nettoyage du serveur sera réessayé plus tard.')
        return
      }

      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
      if (permission !== 'granted') {
        setFeedback('Les notifications sont bloquées. Dans les réglages du site de ton navigateur, choisis « Notifications : Autoriser », puis recharge cette page.')
        return
      }

      const keyResponse = await fetch('/api/push/vapid-public-key')
      if (!keyResponse.ok) {
        setFeedback(keyResponse.status === 503
          ? 'Le service de notifications n’est pas configuré sur le serveur.'
          : 'Impossible de récupérer la configuration des notifications. Réessaie plus tard.')
        return
      }
      const { publicKey } = await keyResponse.json() as { publicKey: string }
      const created = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) })
      const saved = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(created.toJSON()),
      })
      if (!saved.ok) {
        await created.unsubscribe().catch(() => false)
        setFeedback(saved.status === 429
          ? 'Trop de tentatives d’activation depuis cet appareil. Réessaie plus tard.'
          : saved.status === 503
            ? 'Le serveur n’a pas pu enregistrer ton abonnement. Vérifie la configuration push et la base de données.'
            : 'L’abonnement n’a pas pu être enregistré. Réessaie plus tard.')
        return
      }
      setEnabled(true)
      setFeedback('C’est activé ! Tu recevras les actualités des matchs de l’ESI Basketball sur cet appareil.')
    } catch (error) {
      console.error('[push] Activation failed', error)
      setFeedback(Notification.permission === 'denied'
        ? 'Les notifications sont bloquées dans les réglages du navigateur. Autorise-les pour ce site, puis réessaie.'
        : 'Le navigateur n’a pas pu créer l’abonnement push. Vérifie que les notifications sont autorisées, puis réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="settings-card theme-card rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
    <div className="flex items-center gap-3.5">
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold-deep">
        <BellIcon />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="settings-card-title">Notifications de matchs</h2>
        <p className="settings-card-description mt-1">Ne manque aucun rendez-vous des Lions : active les notifications des matchs de l’ESI Basketball.</p>
      </div>
    </div>
    <button type="button" aria-pressed={enabled} disabled={!supported || busy} onClick={toggle}
      className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
      <BellIcon />
      {busy ? 'Activation…' : enabled ? 'Désactiver les notifications' : 'Activer les notifications'}
    </button>
    {feedback && <p role="status" aria-live="polite" className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]">{feedback}</p>}
    {!supported && supportMessage && <p role="status" className="mt-3 text-sm text-muted-foreground">{supportMessage}</p>}
  </section>
}
