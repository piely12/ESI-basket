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
          <h1 className="font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Classement</h1>
        </header>
        <StandingsView rows={standings} />
      </main>
    </>
  )
}
