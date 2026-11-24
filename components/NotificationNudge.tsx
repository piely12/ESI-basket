'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  ENABLE_MESSAGES,
  currentSubscription,
  detectPlatform,
  enableErrorMessage,
  enableMatchNotifications,
  isStandalone,
  pushSupported,
} from '@/lib/push/client'

/*
 * Message du jour : une fois par jour, invite les visiteurs qui n'ont pas
 * encore activé les notifications à toucher la cloche. Sur iPhone (Safari),
 * la cloche mène au guide d'installation des Réglages.
 */

const DAY_KEY = 'lions-notification-nudge-day'
const SHOW_DELAY = 2500

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Abidjan' }).format(new Date())
}

export default function NotificationNudge() {
  const pathname = usePathname()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [needsInstall, setNeedsInstall] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (pathname === '/reglages') return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        if (localStorage.getItem(DAY_KEY) === today()) return
      } catch { return }
      if (!window.isSecureContext) return

      const iosBrowser = detectPlatform() === 'ios' && !isStandalone()
      if (!pushSupported() && !iosBrowser) return
      if (pushSupported()) {
        if (Notification.permission === 'denied') return
        if (Notification.permission === 'granted' && await currentSubscription().catch(() => null)) return
      }
      if (cancelled) return
      try { localStorage.setItem(DAY_KEY, today()) } catch { /* Storage unavailable. */ }
      setNeedsInstall(iosBrowser && !pushSupported())
      setVisible(true)
    }, SHOW_DELAY)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [pathname])

  if (!visible) return null

  async function activate() {
    if (busy) return
    if (needsInstall) {
      setVisible(false)
      router.push('/reglages')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const result = await enableMatchNotifications()
      if (result.ok) {
        setMessage({ tone: 'ok', text: 'Notifications activées ✅' })
        window.setTimeout(() => setVisible(false), 2500)
      } else {
        setMessage({ tone: 'error', text: ENABLE_MESSAGES[result.reason] + (result.detail ? ` (${result.detail})` : '') })
      }
    } catch (error) {
      setMessage({ tone: 'error', text: enableErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="notification-nudge" aria-label="Message du jour" role="dialog">
      <button type="button" onClick={() => void activate()} disabled={busy}
        aria-label={needsInstall ? 'Voir comment activer les notifications' : 'Activer les notifications'}
        className="notification-nudge__bell">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={busy ? 'size-6' : 'size-6 notification-nudge__ring'}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <p className="notification-nudge__kicker">Message du jour</p>
        <p className="notification-nudge__text" data-tone={message?.tone}>
          {message?.text ?? <>Active la cloche de notification pour suivre l’actualité des <strong>LIONS DE L’ESI BASKET HOMMES</strong></>}
        </p>
      </div>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fermer le message du jour" className="notification-nudge__close">×</button>
    </aside>
  )
}
