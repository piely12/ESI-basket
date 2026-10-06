import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicNav from '@/components/PublicNav'
import PlayerCardVisual from '@/components/PlayerCardVisual'
import { getPlayerProfile } from '@/lib/data/public'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getPlayerProfile(id)
  if (!result) notFound()
  const { player, stats } = result
  const totals = stats.reduce((acc, stat) => ({
    points: acc.points + Number(stat.points ?? 0),
    rebounds: acc.rebounds + Number(stat.rebounds ?? 0),
    assists: acc.assists + Number(stat.assists ?? 0),
    steals: acc.steals + Number(stat.steals ?? stat.stl ?? 0),
    plusMinus: acc.plusMinus + Number(stat.plus_minus ?? 0),
    games: acc.games + 1,
  }), { points: 0, rebounds: 0, assists: 0, steals: 0, plusMinus: 0, games: 0 })
  const average = (value: number) => totals.games ? (value / totals.games).toFixed(1) : '—'

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-5 px-4 pb-28 pt-7 sm:px-5">
        <Link href="/equipe" className="inline-block text-sm font-semibold text-[var(--maroon-700)]">← Effectif</Link>
        <PlayerCardVisual player={player} />
        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            ['MJ', totals.games], ['PTS / match', average(totals.points)], ['REB / match', average(totals.rebounds)],
            ['AST / match', average(totals.assists)], ['STL', totals.steals], ['+/-', totals.plusMinus],
          ].map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-center sm:p-4"><div className="font-display text-3xl text-[var(--maroon-900)] sm:text-4xl">{value}</div><div className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs">{label}</div></div>)}
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <h1 className="font-display text-3xl text-[var(--maroon-900)]">Historique des matchs</h1>
          {stats.length ? <div className="mt-2 divide-y divide-[var(--line)]">
            {stats.map((stat) => <div key={stat.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold">vs {stat.match.home_team.is_esi ? stat.match.away_team.name : stat.match.home_team.name}</p><p className="text-xs text-[var(--ink-soft)]">{new Date(stat.match.scheduled_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan', day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
              <p className="text-sm tabular-nums text-[var(--ink-soft)]">{stat.points} pts · {stat.rebounds} reb · {stat.assists} passes</p>
            </div>)}
          </div> : <p className="mt-2 text-sm text-[var(--ink-soft)]">Aucun match joué pour le moment.</p>}
        </section>
      </main>
    </>
  )
}
