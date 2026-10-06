import PublicNav from '@/components/PublicNav'
import MatchList from './MatchList'
import { getAllMatches } from '@/lib/data/public'

export default async function MatchsPage() {
  const matches = await getAllMatches()

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-5">
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold-deep)]">Calendrier</p>
          <h1 className="font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Matchs</h1>
        </header>
        <MatchList matches={matches} />
      </main>
    </>
  )
}
