'use client'

import { useEffect, useState } from 'react'
import { ENABLE_MESSAGES, currentSubscription, detectPlatform, enableErrorMessage, enableMatchNotifications, isStandalone, pushSupported } from '@/lib/push/client'

const SAVE_URL = '/api/push/player'

/** Active ou coupe les convocations sur le téléphone du joueur connecté. */
export default function PlayerPushToggle() {
  const [state, setState] = useState<'checking' | 'unsupported' | 'ios-install' | 'off' | 'on'>('checking')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!pushSupported()) {
        if (alive) setState(detectPlatform() === 'ios' && !isStandalone() ? 'ios-install' : 'unsupported')
        return
      }
      const subscription = await currentSubscription().catch(() => null)
      if (alive) setState(subscription && Notification.permission === 'granted' ? 'on' : 'off')
    })()
    return () => { alive = false }
  }, [])

  async function enable() {
    setBusy(true); setMessage(null)
    try {
      const result = await enableMatchNotifications({ saveUrl: SAVE_URL, welcomeBody: 'Tu recevras ici tes convocations.', clickUrl: '/joueurs' })
      if (result.ok) setState('on')
      else setMessage(ENABLE_MESSAGES[result.reason])
    } catch (error) { setMessage(enableErrorMessage(error)) }
    setBusy(false)
  }

  async function disable() {
    setBusy(true); setMessage(null)
    try {
      const subscription = await currentSubscription()
      if (subscription) {
        await fetch(SAVE_URL, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => undefined)
        await subscription.unsubscribe().catch(() => undefined)
      }
      setState('off')
    } finally { setBusy(false) }
  }

  if (state === 'checking') return <p className="text-sm text-[var(--ink-soft)]">Vérification…</p>
  if (state === 'ios-install') return <p className="text-sm text-[var(--ink-soft)]">Sur iPhone : touche « Partager » puis « Sur l’écran d’accueil », ouvre l’app installée et reviens ici pour activer les notifications.</p>
  if (state === 'unsupported') return <p className="text-sm text-[var(--ink-soft)]">Ce navigateur ne gère pas les notifications. Tu les retrouves toujours dans l’onglet Notifications.</p>
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[var(--ink-soft)]">{state === 'on' ? 'Les convocations arrivent sur ce téléphone.' : 'Reçois « Vous êtes convoqué(e) pour le match… » directement sur ton téléphone.'}</p>
      <button type="button" disabled={busy} onClick={state === 'on' ? disable : enable} className="self-start rounded bg-maroon-panel px-4 py-2 text-on-brand disabled:opacity-60">
        {busy ? '…' : state === 'on' ? 'Désactiver sur ce téléphone' : 'Activer les notifications'}
      </button>
      <p role="alert" className="min-h-5 text-sm text-danger">{message}</p>
    </div>
  )
}
