'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordField from '@/components/PasswordField'

const RULES = [
  { label: '8 caractères minimum', test: (value: string) => [...value].length >= 8 },
  { label: 'Une majuscule', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Une minuscule', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Un chiffre', test: (value: string) => /\d/.test(value) },
  { label: 'Un symbole', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { label: '72 caractères maximum', test: (value: string) => [...value].length <= 72 && new TextEncoder().encode(value).length <= 72 },
]

export default function FirstLoginForm() {
  const router = useRouter()
  const submitted = useRef(false)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const strength = password ? RULES.filter((rule) => rule.test(password)).length : 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitted.current) return
    if (!/^\d{6}$/.test(otp)) { setError('Code invalide ou expiré.'); return }
    if (strength !== RULES.length) { setError('Mot de passe trop faible.'); return }
    if (password !== confirmation) { setError('Les mots de passe ne correspondent pas.'); return }
    submitted.current = true
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/first-login/complete', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ otp, password, confirmation }), cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setOtp(''); setPassword(''); setConfirmation('')
        setError(result.error === 'Mot de passe trop faible.' ? result.error : 'Code invalide ou expiré.')
        submitted.current = false
        setLoading(false)
        return
      }
      setOtp(''); setPassword(''); setConfirmation('')
      const redirectPath = result.redirect
      if (typeof redirectPath !== 'string' || !/^\/(coach|adjoint|stats|joueurs|admin)$/.test(redirectPath)) {
        router.replace('/login')
        return
      }
      router.replace(redirectPath)
    } catch {
      setError('Connexion impossible. Réessayez.')
      submitted.current = false
      setLoading(false)
    }
  }

  return <main className="mx-auto mt-12 w-full max-w-md px-4 pb-12 sm:mt-20">
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">The Lions of ESI</p>
      <h1 className="mt-2 font-display text-4xl text-[var(--maroon-900)]">Première connexion</h1>
      <p className="mb-6 mt-2 text-sm text-[var(--ink-soft)]">Saisissez le code reçu par e-mail et choisissez votre mot de passe personnel.</p>

      <form method="post" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="otp" className="text-sm font-medium text-[var(--ink)]">Code à 6 chiffres</label>
          <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" maxLength={6} required value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-describedby={error ? 'first-login-error' : undefined}
            className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-center text-xl tracking-[0.35em] outline-none focus:border-[var(--gold-deep)] focus:ring-2 focus:ring-[var(--gold-500)]/30" />
        </div>
        <PasswordField id="new-password" label="Nouveau mot de passe" value={password} onChange={setPassword} autoComplete="new-password" maxLength={72} />
        <ul className="-mt-2 grid grid-cols-2 gap-1 text-xs text-[var(--ink-soft)]" aria-label="Règles du mot de passe">
          {RULES.map((rule) => <li key={rule.label} aria-live="polite" className={rule.test(password) ? 'font-semibold text-green-700' : ''}>{rule.test(password) ? '✓ ' : '• '}{rule.label}</li>)}
        </ul>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-label="Robustesse du mot de passe" aria-valuemin={0} aria-valuemax={RULES.length} aria-valuenow={strength}>
          <div className="h-full bg-[var(--gold-deep)] transition-[width]" style={{ width: `${(strength / RULES.length) * 100}%` }} />
        </div>
        <PasswordField id="confirmation" label="Confirmer le mot de passe" value={confirmation} onChange={setConfirmation} autoComplete="new-password" maxLength={72} />
        <p id="first-login-error" role="alert" aria-live="polite" className="min-h-5 text-sm text-red-700">{error}</p>
        <button type="submit" disabled={loading} className="min-h-12 rounded-xl bg-[var(--maroon-900)] px-4 font-semibold text-white hover:bg-[var(--maroon-700)] disabled:cursor-wait disabled:bg-[var(--ink-soft)]">
          {loading ? 'Enregistrement…' : 'Valider'}
        </button>
      </form>
    </section>
  </main>
}
