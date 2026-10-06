import PublicNav from '@/components/PublicNav'
import StandingsView from './StandingsView'
import { getStandings } from '@/lib/data/public'

export default async function ClassementPage() {
  const standings = await getStandings()

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-5">
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold-deep)]">Inter-Écoles INP-HB</p>
          <h1 className="font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Classement</h1>
        </header>
        <StandingsView rows={standings} />
      </main>
    </>
  )
}
