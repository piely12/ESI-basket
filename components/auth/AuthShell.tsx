import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: ReactNode
  /** Étapes d'un parcours (ex. : E-mail, Code, Mot de passe) et index courant. */
  steps?: { labels: string[]; current: number }
  children: ReactNode
  footer?: ReactNode
}

/** Mise en page commune des écrans de connexion et de mot de passe. */
export default function AuthShell({ title, subtitle, steps, children, footer }: Props) {
  return <main className="auth-page">
    <div className="auth-hero" aria-hidden="true" />
    <div className="relative mx-auto w-full max-w-[440px] px-4 pb-16 pt-8 sm:pt-14">
      <Link href="/" className="auth-brand" aria-label="The Lions of ESI — accueil">
        <Image src="/icons/esi-192.png" alt="" width={56} height={56} priority className="auth-crest" />
        <span>
          <span className="auth-brand-name">The Lions of ESI</span>
          <span className="auth-brand-sub">ESI Basketball · INP-HB</span>
        </span>
      </Link>

      <section className="auth-card" aria-labelledby="auth-title">
        {steps && <ol className="auth-steps" aria-label={`Étape ${steps.current + 1} sur ${steps.labels.length}`}>
          {steps.labels.map((label, index) => <li key={label} data-state={index < steps.current ? 'done' : index === steps.current ? 'current' : 'todo'} aria-current={index === steps.current ? 'step' : undefined}>
            <span className="auth-step-dot">{index < steps.current ? '✓' : index + 1}</span>
            <span className="auth-step-label">{label}</span>
          </li>)}
        </ol>}
        <h1 id="auth-title" className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </section>

      {footer && <div className="auth-footer">{footer}</div>}
    </div>
  </main>
}

export function AuthError({ id, message }: { id: string; message: string | null }) {
  return <p id={id} role="alert" aria-live="polite" className={message ? 'auth-error' : 'min-h-0'}>
    {message && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v5m0 3h.01" /></svg>}
    {message}
  </p>
}

export function AuthSubmit({ loading, children, loadingLabel, disabled }: { loading: boolean; children: ReactNode; loadingLabel: string; disabled?: boolean }) {
  return <button type="submit" disabled={loading || disabled} aria-busy={loading || undefined} className="auth-submit">
    {loading && <span className="auth-spinner" aria-hidden="true" />}
    {loading ? loadingLabel : children}
  </button>
}
