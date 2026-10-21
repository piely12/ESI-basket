import PublicNav from '@/components/PublicNav'
import MatchList from './MatchList'
import { getAllMatches } from '@/lib/data/public'

function dateKey(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Abidjan', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function todayInAbidjan() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Abidjan', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export default async function MatchsPage() {
  const matches = await getAllMatches()
  const today = todayInAbidjan()
  const firstUpcoming = matches.find((match) => dateKey(match.scheduled_at) >= today && match.status !== 'termine')
  const initialMonth = (firstUpcoming ? dateKey(firstUpcoming.scheduled_at) : today).slice(0, 7)

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-5">
        <header className="mb-5">
          <h1 className="font-display text-5xl leading-none text-brand sm:text-6xl">Matchs</h1>
        </header>
        <MatchList matches={matches} today={today} initialMonth={initialMonth} />
      </main>
    </>
  )
}
