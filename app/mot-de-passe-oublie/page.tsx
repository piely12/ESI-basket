'use client'

import { useState } from 'react'
import Link from 'next/link'
import PasswordField from '@/components/PasswordField'
import { EMAIL_MAX, isValidEmail, normalizeEmail, validateNewPassword, PASSWORD_MIN } from '@/lib/validation'

type Step = 'email' | 'code' | 'password' | 'done'

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}

export default function MotDePasseOublie() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function run(fn: () => Promise<void>) {
    if (loading) return
    setLoading(true)
    setError(null)
    try { await fn() } catch { setError('Erreur réseau. Réessayez.') }
    setLoading(false)
  }

  const sendEmail = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const clean = normalizeEmail(email)
    if (!isValidEmail(clean)) return setError('Entrez une adresse e-mail valide.')
    const r = await post('/api/auth/forgot', { email: clean })
    if (!r.ok) return setError(r.data.error ?? 'Erreur.')
    setEmail(clean)
    setStep('code')
  }) }

  const checkCode = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const r = await post('/api/auth/verify-otp', { email, code })
    if (!r.ok) { setCode(''); return setError(r.data.error ?? 'Code invalide.') }
    setResetToken(r.data.resetToken)
    setStep('password')
  }) }

  const savePassword = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const problem = validateNewPassword(password, email)
    if (problem) return setError(problem)
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas.')
    const r = await post('/api/auth/reset', { resetToken, password })
    if (!r.ok) return setError(r.data.error ?? 'Erreur.')
    setPassword(''); setConfirm(''); setResetToken('')
    setStep('done')
  }) }

  const errorBox = (
    <p id="form-error" role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">{error}</p>
  )
  const btn = 'rounded bg-[#7a1f2b] p-2 text-white disabled:opacity-60'

  return (
    <main className="mx-auto mt-16 max-w-sm p-6">
      <h1 className="text-2xl font-bold text-[#7a1f2b]">Mot de passe oublié</h1>

      {step === 'email' && (
        <form onSubmit={sendEmail} noValidate className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-neutral-600">Entrez votre e-mail : nous vous envoyons un code à 6 chiffres.</p>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">Adresse e-mail</label>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="username"
              autoCapitalize="none" spellCheck={false} maxLength={EMAIL_MAX} required
              value={email} onChange={(e) => setEmail(e.target.value)}
              aria-describedby="form-error" className="rounded border p-2" />
          </div>
          {errorBox}
          <button className={btn} disabled={loading}>{loading ? 'Envoi…' : 'Recevoir le code'}</button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={checkCode} noValidate className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            Si un compte existe pour <b>{email}</b>, un code vient d&apos;être envoyé. Il est valable 10 minutes.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-sm font-medium">Code à 6 chiffres</label>
            <input id="code" name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              autoComplete="one-time-code" placeholder="000000" required
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              aria-describedby="form-error"
              className="rounded border p-2 text-center text-2xl tracking-[0.5em]" />
          </div>
          {errorBox}
          <button className={btn} disabled={loading || code.length !== 6}>
            {loading ? 'Vérification…' : 'Valider le code'}
          </button>
          <button type="button" className="text-sm underline"
            onClick={() => { setCode(''); setError(null); setStep('email') }}>
            Renvoyer un code
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={savePassword} noValidate className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-neutral-600" id="pw-rules">
            Choisissez un nouveau mot de passe : {PASSWORD_MIN} caractères minimum, avec au moins une lettre et un chiffre.
          </p>
          <PasswordField id="new-password" label="Nouveau mot de passe" value={password}
            onChange={setPassword} autoComplete="new-password" describedBy="pw-rules form-error" />
          <PasswordField id="confirm-password" label="Confirmer le mot de passe" value={confirm}
            onChange={setConfirm} autoComplete="new-password" describedBy="form-error" />
          {errorBox}
          <button className={btn} disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>
      )}

      {step === 'done' && (
        <div className="mt-6" role="status">
          <p className="text-green-700">Mot de passe modifié.</p>
          <Link href="/login" className="mt-4 inline-block underline">Se connecter</Link>
        </div>
      )}

      {step !== 'done' && (
        <Link href="/login" className="mt-6 inline-block text-sm text-neutral-600 underline">Retour à la connexion</Link>
      )}
    </main>
  )
}
