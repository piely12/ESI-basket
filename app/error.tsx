'use client'

import Link from 'next/link'

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="grid min-h-[70vh] place-items-center px-4 py-12">
    <section className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center sm:p-8" role="alert">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">The Lions of ESI</p>
      <h1 className="mt-2 font-display text-4xl text-[var(--maroon-900)]">Cette page ne s’affiche pas</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">Réessaie. Si le problème continue, reviens à l’accueil.</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={retry} className="min-h-11 rounded-lg bg-[var(--maroon-900)] px-5 py-2 font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">Réessayer</button>
        <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] px-5 py-2 font-semibold text-[var(--ink)] hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">Accueil</Link>
      </div>
      {error.digest && <p className="mt-5 text-xs text-[var(--ink-soft)]">Référence : {error.digest}</p>}
    </section>
  </main>
}
