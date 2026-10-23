import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">The Lions of ESI</p>
        <h1 className="mt-2 font-display text-4xl text-brand">Page introuvable</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">Cette adresse ne correspond à aucune page de l’application.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-maroon-panel px-5 py-2 font-semibold text-on-brand hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">
          Retour à l’accueil
        </Link>
      </section>
    </main>
  )
}
