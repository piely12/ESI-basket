'use client'

import { useState } from 'react'
import Link from 'next/link'
import PasswordField from '@/components/PasswordField'
import { EMAIL_MAX, isValidEmail, normalizeEmail } from '@/lib/validation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return // anti double-envoi
    setError(null)

    const cleanEmail = normalizeEmail(email)
    if (!isValidEmail(cleanEmail)) return setError('Entrez une adresse e-mail valide.')
    if (!password) return setError('Entrez votre mot de passe.')

    setLoading(true)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPassword('') // on ne garde jamais un mot de passe refusé dans le formulaire
        setError(data.error ?? 'Connexion impossible.')
        setLoading(false)
        return
      }
      window.location.href = data.redirectTo
    } catch (requestError) {
      setError(requestError instanceof DOMException && requestError.name === 'AbortError'
        ? 'Le serveur met trop de temps à répondre. Vérifiez la connexion Supabase et réessayez.'
        : 'Erreur réseau. Réessayez.')
      setLoading(false)
    } finally {
      window.clearTimeout(timeout)
    }
  }

  return (
    <main className="mx-auto mt-16 max-w-sm p-6">
      <h1 className="text-2xl font-bold text-[#7a1f2b]">The Lions of ESI</h1>
      <p className="mb-6 text-neutral-600">Connexion</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">Adresse e-mail</label>
          <input
            id="email" name="email" type="email" inputMode="email"
            autoComplete="username" autoCapitalize="none" spellCheck={false}
            maxLength={EMAIL_MAX} required
            value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className="rounded border p-2"
          />
        </div>

        <PasswordField
          id="password" label="Mot de passe" value={password} onChange={setPassword}
          autoComplete="current-password"
          invalid={!!error} describedBy={error ? 'login-error' : undefined}
        />

        <p id="login-error" role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">
          {error}
        </p>

        <button
          type="submit" disabled={loading}
          className="rounded bg-[#7a1f2b] p-2 text-white disabled:opacity-60"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <Link href="/mot-de-passe-oublie" className="mt-4 inline-block text-sm text-[#7a1f2b] underline">
        Mot de passe oublié ?
      </Link>
    </main>
  )
}
