'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { displayName, loadAccount, ROLE_LABELS, useAccount } from '@/lib/account-client'
import { currentSubscription, saveSubscription } from '@/lib/push/client'

const STAFF_HOME: Record<string, string> = { coach: '/coach', coach_adjoint: '/adjoint', statisticienne: '/stats', admin: '/admin' }

/** Carte « Mon compte » des Réglages : pseudo, espace staff, connexion. */
export default function AccountSettings() {
  const router = useRouter()
  const [account, setAccount] = useAccount()
  const [nickname, setNickname] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [leaving, setLeaving] = useState(false)

  if (account === undefined) {
    return <section id="mon-compte" aria-busy="true" aria-label="Mon compte" className="settings-card theme-card min-h-[92px] scroll-mt-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4" />
  }

  if (!account.authenticated) {
    return <section id="mon-compte" className="settings-card theme-card flex scroll-mt-24 flex-wrap items-center gap-3.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4" aria-labelledby="account-title">
      <div className="min-w-0 flex-1">
        <h2 id="account-title" className="settings-card-title">Compte joueur ou staff</h2>
        <p className="settings-card-description mt-1">Connecte-toi pour recevoir tes convocations et personnaliser l’application.</p>
      </div>
      <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Se connecter</Link>
    </section>
  }

  const current = nickname ?? account.nickname ?? ''
  const fullName = displayName(`${account.firstName} ${account.lastName}`.trim())
  const staffHome = STAFF_HOME[account.role]

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const value = current.trim()
    if (value && (value.length < 2 || value.length > 20)) {
      setFeedback({ tone: 'error', text: 'Ton pseudo doit faire entre 2 et 20 caractères.' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nickname: value }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string; nickname?: string | null }
      if (!response.ok) {
        setFeedback({ tone: 'error', text: result.error ?? 'Enregistrement impossible. Réessaie.' })
        return
      }
      setNickname(result.nickname ?? '')
      setAccount(await loadAccount(true))
      setFeedback({ tone: 'ok', text: value ? `C’est noté, ${value} !` : 'Pseudo retiré.' })
    } catch {
      setFeedback({ tone: 'error', text: 'Connexion indisponible. Réessaie.' })
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    setLeaving(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      // Signed out: this device no longer receives the player's call-ups.
      const subscription = 'serviceWorker' in navigator ? await currentSubscription().catch(() => null) : null
      if (subscription) await saveSubscription(subscription).catch(() => null)
    } finally {
      try { sessionStorage.removeItem('lions-push-linked') } catch { /* Storage unavailable. */ }
      setAccount(await loadAccount(true))
      setLeaving(false)
      router.replace('/')
      router.refresh()
    }
  }

  return <section id="mon-compte" className="settings-card theme-card scroll-mt-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4" aria-labelledby="account-title">
    <div className="flex items-center gap-3.5">
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-maroon-panel font-display text-xl text-[var(--gold-500)]">
        {(account.nickname || fullName).slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="account-title" className="settings-card-title truncate">{account.nickname || fullName}</h2>
        <p className="settings-card-description mt-0.5 truncate">{ROLE_LABELS[account.role] ?? 'Compte'}{account.nickname ? ` · ${fullName}` : ''}</p>
      </div>
    </div>

    <form onSubmit={save} noValidate className="mt-4 border-t border-settings-divider pt-4">
      <label htmlFor="nickname" className="text-sm font-semibold text-foreground">Pseudo</label>
      <p id="nickname-help" className="settings-card-description mt-0.5">Le nom affiché pour toi dans l’application. 2 à 20 caractères.</p>
      <div className="mt-2 flex gap-2">
        <input id="nickname" name="nickname" value={current} onChange={(event) => { setNickname(event.target.value); setFeedback(null) }}
          maxLength={20} autoComplete="nickname" placeholder="Ex. : Sakito" aria-describedby="nickname-help nickname-feedback"
          aria-invalid={feedback?.tone === 'error' || undefined}
          className="auth-input min-w-0 flex-1" />
        <button type="submit" disabled={saving || current.trim() === (account.nickname ?? '')} className="min-h-12 shrink-0 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? '…' : 'Enregistrer'}
        </button>
      </div>
      <p id="nickname-feedback" role={feedback?.tone === 'error' ? 'alert' : 'status'} className={`mt-2 min-h-5 text-sm ${feedback?.tone === 'error' ? 'text-danger' : 'text-success'}`}>{feedback?.text}</p>
    </form>

    <div className="flex flex-wrap items-center gap-3 border-t border-settings-divider pt-4">
      {staffHome && <Link href={staffHome} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Ouvrir mon espace</Link>}
      <button type="button" onClick={() => void logout()} disabled={leaving} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60">
        {leaving ? 'Déconnexion…' : 'Se déconnecter'}
      </button>
    </div>
  </section>
}
