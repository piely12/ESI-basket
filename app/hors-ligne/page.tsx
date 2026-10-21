import Link from 'next/link'

export default function OfflinePage() {
  return <main className="grid min-h-dvh place-items-center bg-[var(--paper)] px-4 py-10">
    <section className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7 text-center shadow-sm sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">The Lions of ESI</p>
      <h1 className="mt-3 font-display text-4xl text-brand">Connexion indisponible</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">Cette page n’est pas enregistrée hors ligne. Les données affichées sur les pages publiques peuvent nécessiter une connexion pour être actualisées.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-maroon-panel px-5 font-semibold text-on-brand">Réessayer</Link>
    </section>
  </main>
}
