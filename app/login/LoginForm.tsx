'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PasswordField from '@/components/PasswordField'
import AuthShell, { AuthError, AuthSubmit } from '@/components/auth/AuthShell'
import { EMAIL_MAX, isValidEmail, normalizeEmail } from '@/lib/validation'

const DESTINATION = /^\/(|coach|adjoint|stats|joueurs|admin|premiere-connexion)$/

export default function LoginForm() {
  const router = useRouter()
  const submitted = useRef(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitted.current) return
    const cleanEmail = normalizeEmail(email)
    if (!isValidEmail(cleanEmail)) { setError('Entre une adresse e-mail valide.'); return }
    if (!password) { setError('Entre ton mot de passe.'); return }

    submitted.current = true
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))
      const redirectPath = result.redirect
      if (!response.ok || typeof redirectPath !== 'string' || !DESTINATION.test(redirectPath)) {
        setPassword('')
        setError(!response.ok && typeof result.error === 'string' ? result.error : 'Connexion impossible. Réessaie.')
        submitted.current = false
        setLoading(false)
        return
      }
      setRedirecting(true)
      router.replace(redirectPath)
      router.refresh()
    } catch {
      setError('Connexion impossible. Vérifie ta connexion internet.')
      submitted.current = false
      setLoading(false)
    }
  }

  return <AuthShell
    title="Connexion"
    subtitle="Joueurs et staff des Lions : connecte-toi avec l’adresse e-mail de ton invitation."
    footer={<>
      <Link href="/mot-de-passe-oublie?invitation=1" className="auth-link">J’ai reçu une invitation</Link>
      <Link href="/" className="auth-link">Retour au site</Link>
    </>}
  >
    <form method="post" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" aria-busy={loading || redirecting}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="auth-label">Adresse e-mail</label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="username"
          autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={EMAIL_MAX} required autoFocus
          value={email} onChange={(event) => { setEmail(event.target.value); setError('') }}
          placeholder="prenom.nom@gmail.com"
          aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined}
          className="auth-input w-full" />
      </div>

      <div className="flex flex-col gap-1.5">
        <PasswordField id="password" label="Mot de passe" value={password} onChange={(value) => { setPassword(value); setError('') }}
          autoComplete="current-password" invalid={!!error} describedBy={error ? 'login-error' : capsLock ? 'caps-lock' : undefined}
          onCapsLockChange={setCapsLock} />
        <div className="flex items-center justify-between gap-3">
          <p id="caps-lock" className="auth-hint" role="status">{capsLock ? 'Verr. Maj. activée' : ''}</p>
          <Link href="/mot-de-passe-oublie" className="auth-link shrink-0">Mot de passe oublié ?</Link>
        </div>
      </div>

      <AuthError id="login-error" message={error || null} />
      <AuthSubmit loading={loading || redirecting} loadingLabel={redirecting ? 'Ouverture…' : 'Connexion…'}>Se connecter</AuthSubmit>
    </form>
  </AuthShell>
}
