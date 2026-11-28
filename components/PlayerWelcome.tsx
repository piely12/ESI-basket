'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { greetingName, useAccount, type Convocation } from '@/lib/account-client'
import {
  currentSubscription, enableErrorMessage, enableMatchNotifications, ENABLE_MESSAGES,
  isStandalone, detectPlatform, pushSupported, saveSubscription,
} from '@/lib/push/client'
import { formatMatchTime, withArticle } from '@/lib/push/match-reminder'

type PushState = 'checking' | 'on' | 'off' | 'install' | 'blocked'
const LINK_KEY = 'lions-push-linked'

const dayLabel = (iso: string) => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Abidjan',
}).format(new Date(iso))

/** Accueil personnalisé d’un joueur connecté : pseudo, convocation, alertes. */
export default function PlayerWelcome() {
  const [account] = useAccount()
  const [push, setPush] = useState<PushState>('checking')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const isPlayer = account?.authenticated === true && account.role === 'joueur'

  useEffect(() => {
    if (!isPlayer) return
    let active = true
    void (async () => {
      let next: PushState = 'off'
      if (!pushSupported()) next = detectPlatform() === 'ios' && !isStandalone() ? 'install' : 'blocked'
      else if (Notification.permission === 'denied') next = 'blocked'
      else if (Notification.permission === 'granted') {
        const subscription = await currentSubscription().catch(() => null)
        if (subscription) {
          next = 'on'
          // Rattache cet appareil au compte, une fois par visite.
          let linked = false
          try { linked = sessionStorage.getItem(LINK_KEY) === '1' } catch { /* Storage unavailable. */ }
          if (!linked) {
            const saved = await saveSubscription(subscription).catch(() => null)
            if (saved?.ok) try { sessionStorage.setItem(LINK_KEY, '1') } catch { /* Storage unavailable. */ }
          }
        }
      }
      if (active) setPush(next)
    })()
    return () => { active = false }
  }, [isPlayer])

  if (!account || account.authenticated !== true || account.role !== 'joueur') return null

  async function enable() {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const result = await enableMatchNotifications()
      if (result.ok) {
        setPush('on')
        try { sessionStorage.setItem(LINK_KEY, '1') } catch { /* Storage unavailable. */ }
      } else {
        if (result.reason === 'denied') setPush('blocked')
        setMessage(ENABLE_MESSAGES[result.reason] + (result.detail ? ` (${result.detail})` : ''))
      }
    } catch (error) {
      setMessage(enableErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const name = greetingName(account)
  return <section aria-labelledby="player-welcome-title" className="player-welcome theme-card rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Espace joueur</p>
        <h2 id="player-welcome-title" className="mt-1 font-display text-3xl leading-none text-brand [overflow-wrap:anywhere]">Salut {name}</h2>
      </div>
      <Link href="/reglages#mon-compte" className="shrink-0 pt-1 text-sm font-semibold text-brand underline decoration-[1.5px] underline-offset-4">
        {account.nickname ? 'Mon compte' : 'Choisir un pseudo'}
      </Link>
    </div>

    {account.convocation ? <ConvocationCard convocation={account.convocation} /> : <p className="mt-3 text-sm text-[var(--ink-soft)]">
      Pas de convocation pour le moment. Tu seras prévenu dès que le coach publiera la composition.
    </p>}

    {push === 'off' && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
      <p className="min-w-0 flex-1 text-sm text-[var(--ink)]">Active les notifications pour savoir quand tu es convoqué.</p>
      <button type="button" onClick={() => void enable()} disabled={busy} className="min-h-11 rounded-xl bg-maroon-panel px-4 text-sm font-bold text-on-brand transition hover:bg-[var(--maroon-700)] disabled:cursor-wait disabled:opacity-70">
        {busy ? 'Activation…' : 'Activer'}
      </button>
    </div>}
    {push === 'install' && <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm text-[var(--ink)]">
      Sur iPhone, installe d’abord l’application pour recevoir tes convocations. <Link href="/reglages#installer" className="font-semibold text-brand underline underline-offset-4">Voir comment faire</Link>
    </p>}
    {push === 'blocked' && <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm text-[var(--ink-soft)]">
      Les notifications sont bloquées sur cet appareil. Autorise-les dans les réglages du navigateur pour recevoir tes convocations.
    </p>}
    {message && <p role="status" className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p>}
  </section>
}

function ConvocationCard({ convocation }: { convocation: Convocation }) {
  const opponent = convocation.opponent ? withArticle(convocation.opponent) : 'l’adversaire'
  const time = convocation.kickoffConfirmed ? ` · ${formatMatchTime(convocation.scheduledAt)}` : ''
  return <div className="convocation-card mt-3 rounded-xl bg-maroon-panel p-4 text-on-brand">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold-500)]">Tu es convoqué</p>
    <p className="mt-1 font-display text-2xl leading-tight">Contre {opponent}</p>
    <p className="mt-1 text-sm text-on-brand/85 first-letter:uppercase">
      <time dateTime={convocation.scheduledAt}>{dayLabel(convocation.scheduledAt)}{time}</time>
      {convocation.location ? ` · ${convocation.location}` : ''}
    </p>
    <Link href={`/matchs/${convocation.matchId}#composition`} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[var(--gold-500)] px-4 text-sm font-bold text-[var(--gold-foreground)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
      Voir la composition
    </Link>
  </div>
}
