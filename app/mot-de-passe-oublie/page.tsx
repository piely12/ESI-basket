'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PasswordField from '@/components/PasswordField'
import AuthShell, { AuthError, AuthSubmit } from '@/components/auth/AuthShell'
import PasswordStrength, { passwordRules } from '@/components/auth/PasswordStrength'
import { EMAIL_MAX, isValidEmail, normalizeEmail, validateNewPassword } from '@/lib/validation'

type Step = 'email' | 'code' | 'password' | 'done'

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}

function EmailInput({ id, value, onChange, autoFocus }: { id: string; value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  return <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="auth-label">Adresse e-mail</label>
    <input id={id} name="email" type="email" inputMode="email" autoComplete="username"
      autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={EMAIL_MAX} required autoFocus={autoFocus}
      value={value} onChange={(event) => onChange(event.target.value)} placeholder="prenom.nom@gmail.com"
      aria-describedby="form-error" className="auth-input w-full" />
  </div>
}

export default function MotDePasseOublie() {
  const [step, setStep] = useState<Step>('email')
  const [invitationMode, setInvitationMode] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('invitation') === '1') {
      // Keep the email out of the invitation URL; ask for it alongside the emailed code.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvitationMode(true)
      setStep('code')
    }
  }, [])

  async function run(fn: () => Promise<void>) {
    if (loading) return
    setLoading(true)
    setError(null)
    try { await fn() } catch { setError('Erreur réseau. Vérifie ta connexion et réessaie.') }
    setLoading(false)
  }

  const sendEmail = (e: React.FormEvent) => { e.preventDefault(); void run(async () => {
    const clean = normalizeEmail(email)
    if (!isValidEmail(clean)) return setError('Entre une adresse e-mail valide.')
    const r = await post('/api/auth/forgot', { email: clean })
    if (!r.ok) return setError(r.data.error ?? 'Envoi impossible. Réessaie.')
    setEmail(clean)
    setStep('code')
  }) }

  const checkCode = (e: React.FormEvent) => { e.preventDefault(); void run(async () => {
    const clean = normalizeEmail(email)
    if (!isValidEmail(clean)) return setError('Entre l’adresse e-mail qui a reçu le code.')
    if (!/^\d{6}$/.test(code)) return setError('Saisis les 6 chiffres du code.')
    setEmail(clean)
    const r = await post('/api/auth/verify-otp', { email: clean, code })
    if (!r.ok) { setCode(''); return setError(r.data.error ?? 'Code invalide ou expiré.') }
    setResetToken(r.data.resetToken)
    setStep('password')
  }) }

  const savePassword = (e: React.FormEvent) => { e.preventDefault(); void run(async () => {
    if (!passwordRules(password, email).every((rule) => rule.ok)) return setError('Ton mot de passe ne respecte pas encore toutes les règles.')
    const problem = validateNewPassword(password, email)
    if (problem) return setError(problem)
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas.')
    const r = await post('/api/auth/reset', { resetToken, password })
    if (!r.ok) return setError(r.data.error ?? 'Enregistrement impossible. Réessaie.')
    setPassword(''); setConfirm(''); setResetToken('')
    setStep('done')
  }) }

  const labels = invitationMode ? ['Code', 'Mot de passe'] : ['E-mail', 'Code', 'Mot de passe']
  const order: Step[] = invitationMode ? ['code', 'password'] : ['email', 'code', 'password']
  const steps = step === 'done' ? undefined : { labels, current: Math.max(0, order.indexOf(step)) }
  const mismatch = confirm.length > 0 && confirm !== password

  const title = step === 'done'
    ? (invitationMode ? 'Compte activé' : 'Mot de passe modifié')
    : invitationMode ? 'Activer mon compte' : 'Mot de passe oublié'
  const subtitle = step === 'email'
    ? 'Entre ton adresse e-mail : tu recevras un code à 6 chiffres pour choisir un nouveau mot de passe.'
    : step === 'code'
      ? (invitationMode
        ? 'Saisis ton adresse e-mail et le code reçu dans l’e-mail d’invitation des Lions.'
        : <>Si un compte existe pour <b>{email}</b>, un code vient d’être envoyé. Il est valable 10 minutes.</>)
      : step === 'password'
        ? 'Choisis un mot de passe que tu n’utilises nulle part ailleurs.'
        : undefined

  return <AuthShell
    title={title}
    subtitle={subtitle}
    steps={steps}
    footer={step !== 'done' && <Link href="/login" className="auth-link">Retour à la connexion</Link>}
  >
    {step === 'email' && (
      <form onSubmit={sendEmail} noValidate className="flex flex-col gap-4">
        <EmailInput id="email" value={email} onChange={(value) => { setEmail(value); setError(null) }} autoFocus />
        <AuthError id="form-error" message={error} />
        <AuthSubmit loading={loading} loadingLabel="Envoi…">Recevoir le code</AuthSubmit>
        <button type="button" className="auth-link self-center" onClick={() => { setError(null); setInvitationMode(true); setStep('code') }}>
          J’ai déjà un code d’invitation
        </button>
      </form>
    )}

    {step === 'code' && (
      <form onSubmit={checkCode} noValidate className="flex flex-col gap-4">
        {invitationMode && <EmailInput id="invitation-email" value={email} onChange={(value) => { setEmail(value); setError(null) }} autoFocus />}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="auth-label">Code à 6 chiffres</label>
          <input id="code" name="code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
            autoComplete="one-time-code" placeholder="••••••" required autoFocus={!invitationMode}
            value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
            aria-describedby="code-hint form-error"
            className="auth-input auth-code w-full" />
          <p id="code-hint" className="auth-hint">Pas reçu ? Regarde dans les spams ou les promotions.</p>
        </div>
        <AuthError id="form-error" message={error} />
        <AuthSubmit loading={loading} loadingLabel="Vérification…" disabled={code.length !== 6}>Valider le code</AuthSubmit>
        <button type="button" className="auth-link self-center"
          onClick={() => { setCode(''); setError(null); setInvitationMode(false); setStep('email') }}>
          {invitationMode ? 'Code expiré ? En recevoir un nouveau' : 'Renvoyer un code'}
        </button>
      </form>
    )}

    {step === 'password' && (
      <form onSubmit={savePassword} noValidate className="flex flex-col gap-4">
        <PasswordField id="new-password" label="Nouveau mot de passe" value={password}
          onChange={(value) => { setPassword(value); setError(null) }} autoComplete="new-password" describedBy="password-strength form-error" autoFocus />
        <PasswordStrength id="password-strength" password={password} email={email} />
        <div className="flex flex-col gap-1.5">
          <PasswordField id="confirm-password" label="Confirmer le mot de passe" value={confirm}
            onChange={(value) => { setConfirm(value); setError(null) }} autoComplete="new-password" invalid={mismatch} describedBy="confirm-hint form-error" />
          <p id="confirm-hint" className={`auth-hint ${mismatch ? 'text-danger' : ''}`} aria-live="polite">
            {mismatch ? 'Les deux mots de passe ne correspondent pas.' : confirm && confirm === password ? '✓ Les mots de passe correspondent.' : ''}
          </p>
        </div>
        <AuthError id="form-error" message={error} />
        <AuthSubmit loading={loading} loadingLabel="Enregistrement…">Enregistrer</AuthSubmit>
      </form>
    )}

    {step === 'done' && (
      <div role="status" className="text-center">
        <span className="auth-success" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
        </span>
        <p className="text-[0.9375rem] text-[var(--ink-soft)]">
          {invitationMode ? 'Ton mot de passe est enregistré. Connecte-toi pour rejoindre les Lions.' : 'Ton nouveau mot de passe est enregistré. Tu peux te connecter.'}
        </p>
        <Link href="/login" className="auth-submit mt-6">Se connecter</Link>
      </div>
    )}
  </AuthShell>
}
