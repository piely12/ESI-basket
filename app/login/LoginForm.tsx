'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PasswordField from '@/components/PasswordField'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { EMAIL_MAX, isValidEmail, normalizeEmail } from '@/lib/validation'

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
    if (!isValidEmail(cleanEmail) || !password) {
      setError('Identifiants incorrects.')
      return
    }

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
      if (!response.ok) {
        setPassword('')
        setError(typeof result.error === 'string' ? result.error : 'Identifiants incorrects.')
        submitted.current = false
        setLoading(false)
        return
      }
      const redirectPath = result.redirect
      if (typeof redirectPath !== 'string' || !/^\/(coach|stats|actus|joueurs|admin|premiere-connexion)$/.test(redirectPath)) {
        setPassword('')
        setError('Connexion impossible. Réessayez.')
        submitted.current = false
        setLoading(false)
        return
      }
      setRedirecting(true)
      router.replace(redirectPath)
    } catch {
      setError('Connexion impossible. Réessayez.')
      submitted.current = false
      setLoading(false)
    }
  }

  if (loading || redirecting) {
    return <main className="grid min-h-[75vh] place-items-center px-4 py-10" role="status" aria-busy="true" aria-label={redirecting ? 'Ouverture de votre espace' : 'Vérification de la connexion'}>
      <span className="sr-only">{redirecting ? 'Connexion validée. Ouverture de votre espace…' : 'Vérification des identifiants. Chargement en cours…'}</span>
      <section className="w-full max-w-3xl space-y-5" aria-hidden="true">
        <div className="rounded-2xl bg-[var(--maroon-900)] p-6 sm:p-8">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-4 h-10 w-64 max-w-full" />
          <p className="mt-4 text-sm text-white/80">{redirecting ? 'Accès confirmé. Ouverture de votre espace…' : 'Vérification de vos identifiants…'}</p>
          <SkeletonText lines={2} className="mt-4 max-w-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><Skeleton className="h-6 w-36" /><SkeletonText lines={3} className="mt-5" /></article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><Skeleton className="h-6 w-40" /><SkeletonText lines={3} className="mt-5" /></article>
        </div>
      </section>
    </main>
  }

  return (
    <main className="mx-auto mt-12 w-full max-w-md px-4 pb-12 sm:mt-20">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">The Lions of ESI</p>
        <h1 className="mt-2 font-display text-4xl text-[var(--maroon-900)]">Connexion</h1>
        <p className="mb-6 mt-2 text-sm text-[var(--ink-soft)]">Accédez à votre espace de gestion de l’équipe.</p>

        <form method="post" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-[var(--ink)]">Adresse e-mail</label>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="username"
              autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={EMAIL_MAX} required autoFocus
              value={email} onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined}
              className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-base text-[var(--ink)] outline-none focus:border-[var(--gold-deep)] focus:ring-2 focus:ring-[var(--gold-500)]/30" />
          </div>

          <PasswordField id="password" label="Mot de passe" value={password} onChange={setPassword}
            autoComplete="current-password" invalid={!!error} describedBy={error ? 'login-error' : undefined}
            onCapsLockChange={setCapsLock} />
          {capsLock && <p className="-mt-3 text-xs text-[var(--ink-soft)]" role="status">Verr. Maj. activée</p>}

          <p id="login-error" role="alert" aria-live="polite" className="min-h-5 text-sm text-red-700">{error}</p>
          <button type="submit" disabled={loading}
            className="min-h-12 rounded-xl bg-[var(--maroon-900)] px-4 font-semibold text-white transition hover:bg-[var(--maroon-700)] disabled:cursor-wait disabled:bg-[var(--ink-soft)]">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <Link href="/mot-de-passe-oublie" className="mt-5 inline-block text-sm text-[var(--maroon-900)] underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
      </section>
    </main>
  )
}
