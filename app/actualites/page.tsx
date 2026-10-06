import PublicNav from '@/components/PublicNav'

export default function ActualitesPage() {
  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-28 pt-8 sm:px-5">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold-deep)]">Le journal des Lions</p>
          <h1 className="font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Actualités</h1>
        </header>
        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">The Lions of ESI</p>
          <h2 className="mt-2 font-display text-3xl text-[var(--maroon-900)]">Aucune actualité publiée pour le moment</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Les articles et le prochain MVP apparaîtront ici lorsqu’ils auront été publiés par l’équipe.</p>
        </section>
        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="font-display text-3xl text-[var(--maroon-900)]">À propos</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">The Lions of ESI représentent l’École Supérieure d’Industrie dans la compétition Inter-Écoles de l’INP-HB. Cette page rassemble les actualités et les temps forts de l’équipe.</p>
        </section>
      </main>
    </>
  )
}
