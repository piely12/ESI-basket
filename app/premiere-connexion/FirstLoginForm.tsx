'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordField from '@/components/PasswordField'
import AuthShell, { AuthError, AuthSubmit } from '@/components/auth/AuthShell'
import PasswordStrength, { passwordRules } from '@/components/auth/PasswordStrength'

const DESTINATION = /^\/(|coach|adjoint|stats|joueurs|admin)$/

export default function FirstLoginForm() {
  const router = useRouter()
  const submitted = useRef(false)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const mismatch = confirmation.length > 0 && confirmation !== password

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitted.current) return
    if (!/^\d{6}$/.test(otp)) { setError('Saisis les 6 chiffres du code reçu par e-mail.'); return }
    if (!passwordRules(password).every((rule) => rule.ok)) { setError('Ton mot de passe ne respecte pas encore toutes les règles.'); return }
    if (password !== confirmation) { setError('Les deux mots de passe ne correspondent pas.'); return }
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
        setOtp('')
        setError(typeof result.error === 'string' ? result.error : 'Code invalide ou expiré.')
        submitted.current = false
        setLoading(false)
        return
      }
      setOtp(''); setPassword(''); setConfirmation('')
      const redirectPath = result.redirect
      if (typeof redirectPath !== 'string' || !DESTINATION.test(redirectPath)) { router.replace('/login'); return }
      router.replace(redirectPath)
      router.refresh()
    } catch {
      setError('Connexion impossible. Vérifie ta connexion internet.')
      submitted.current = false
      setLoading(false)
    }
  }

  return <AuthShell
    title="Bienvenue chez les Lions"
    subtitle="Dernière étape : saisis le code reçu par e-mail, puis choisis ton mot de passe personnel."
    steps={{ labels: ['Invitation', 'Code', 'Mot de passe'], current: otp.length === 6 ? 2 : 1 }}
  >
    <form method="post" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="otp" className="auth-label">Code à 6 chiffres</label>
        <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus
          pattern="[0-9]{6}" maxLength={6} required value={otp} placeholder="••••••"
          onChange={(event) => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
          aria-describedby="otp-hint first-login-error"
          className="auth-input auth-code w-full" />
        <p id="otp-hint" className="auth-hint">Valable 10 minutes. Pense à regarder dans les spams.</p>
      </div>

      <PasswordField id="new-password" label="Nouveau mot de passe" value={password} onChange={(value) => { setPassword(value); setError('') }}
        autoComplete="new-password" maxLength={72} describedBy="password-strength" />
      <PasswordStrength id="password-strength" password={password} />

      <div className="flex flex-col gap-1.5">
        <PasswordField id="confirmation" label="Confirmer le mot de passe" value={confirmation} onChange={(value) => { setConfirmation(value); setError('') }}
          autoComplete="new-password" maxLength={72} invalid={mismatch} describedBy="confirmation-hint" />
        <p id="confirmation-hint" className={`auth-hint ${mismatch ? 'text-danger' : ''}`} aria-live="polite">
          {mismatch ? 'Les deux mots de passe ne correspondent pas.' : confirmation && confirmation === password ? '✓ Les mots de passe correspondent.' : ''}
        </p>
      </div>

      <AuthError id="first-login-error" message={error || null} />
      <AuthSubmit loading={loading} loadingLabel="Enregistrement…">Valider et entrer</AuthSubmit>
    </form>
  </AuthShell>
}
