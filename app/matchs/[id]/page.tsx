import Image from 'next/image'
import { notFound } from 'next/navigation'
import PublicNav from '@/components/PublicNav'
import MatchCard from '@/components/MatchCard'
import TeamLogo from '@/components/TeamLogo'
import { getMatchById } from '@/lib/data/public'
import { pct, shortDate } from '@/lib/format'

function abidjanDate(iso: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Abidjan', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getMatchById(id)
  if (!result) notFound()
  const { match, teamStats, playerStats, lineups } = result
  const isEsiMatch = match.home_team.is_esi || match.away_team.is_esi
  const today = abidjanDate(new Date().toISOString())
  const matchDay = abidjanDate(match.scheduled_at)
  const lineupVisible = match.status === 'termine' || today >= matchDay
  const starters = lineups.filter((lineup) => lineup.is_starter)
  const bench = lineups.filter((lineup) => !lineup.is_starter)
  const rankStats = match.status === 'termine'

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-28 pt-8 sm:px-5">
        <MatchCard match={match} large />

        {isEsiMatch && <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Feuille de match</p><h1 className="font-display text-3xl text-[var(--maroon-900)]">Composition ESI</h1></div>
            <TeamLogo team={match.home_team.is_esi ? match.home_team : match.away_team} size={48} className="h-12 w-12" />
          </div>
          {!lineupVisible ? <div className="rounded-lg bg-[var(--line)]/30 p-6 text-center">
            <div className="font-display text-5xl text-[var(--ink-soft)]">N/A</div>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">La composition sera dévoilée le jour du match.</p>
          </div> : starters.length ? <div className="grid gap-4 md:grid-cols-2">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border-2 border-[var(--gold-500)] bg-[var(--gold-500)]/15">
              <div className="absolute left-1/2 top-0 h-[44%] w-[36%] -translate-x-1/2 border-2 border-t-0 border-[var(--gold-500)]" />
              <div className="absolute left-1/2 top-0 h-[80%] w-[80%] -translate-x-1/2 rounded-b-full border-2 border-t-0 border-[var(--gold-500)]" />
              {starters.slice(0, 5).map((lineup, index) => {
                const spots = [[50, 18], [18, 40], [82, 40], [30, 72], [70, 72]]
                const spot = spots[index]
                return <div key={lineup.player.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${spot[0]}%`, top: `${spot[1]}%` }}>
                  <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[var(--maroon-900)] font-display text-lg text-white ring-2 ring-[var(--gold-500)]">
                    {lineup.player.photo_url ? <Image src={lineup.player.photo_url} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" /> : lineup.player.jersey_number ?? '—'}
                  </div>
                  <div className="mt-1 max-w-24 truncate rounded bg-[var(--surface)] px-1.5 text-[10px] font-bold">{lineup.player.last_name}</div>
                </div>
              })}
            </div>
            <div className="space-y-4 text-sm">
              <div><h2 className="mb-2 font-display text-2xl text-[var(--maroon-900)]">5 majeur</h2><ul className="space-y-1">{starters.map((lineup) => <li key={lineup.player.id} className="flex items-center justify-between border-b border-[var(--line)] py-1"><span>#{lineup.player.jersey_number} {lineup.player.first_name} {lineup.player.last_name}</span><span className="text-[var(--ink-soft)]">{lineup.player.position}</span></li>)}</ul></div>
              {bench.length > 0 && <div><h2 className="mb-2 font-display text-2xl text-[var(--maroon-900)]">Remplaçants</h2><ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">{bench.map((lineup) => <li key={lineup.player.id} className="border-b border-[var(--line)] py-1">#{lineup.player.jersey_number} {lineup.player.first_name} {lineup.player.last_name}</li>)}</ul></div>}
            </div>
          </div> : <p className="rounded-lg bg-[var(--line)]/30 p-4 text-sm text-[var(--ink-soft)]">Composition en attente de validation.</p>}
        </section>}

        {rankStats && teamStats.length > 0 && <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Comparaison</p><h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Statistiques d’équipe</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm">
            <thead className="text-xs uppercase text-[var(--ink-soft)]"><tr className="text-left"><th className="py-2">Équipe</th><th>PTS</th><th>REB</th><th>AST</th><th>TIRS</th><th>3PT</th><th>LF</th></tr></thead>
            <tbody>{teamStats.map((stat) => <tr key={stat.id} className="border-t border-[var(--line)]"><td className="py-2 font-semibold">{stat.team_id === match.home_team.id ? match.home_team.name : match.away_team.name}</td><td>{stat.points}</td><td>{stat.rebounds}</td><td>{stat.assists}</td><td>{stat.fg_made}/{stat.fg_attempted} ({pct(stat.fg_made, stat.fg_attempted)})</td><td>{stat.three_made}/{stat.three_attempted} ({pct(stat.three_made, stat.three_attempted)})</td><td>{stat.ft_made}/{stat.ft_attempted} ({pct(stat.ft_made, stat.ft_attempted)})</td></tr>)}</tbody>
          </table></div>
        </section>}

        {rankStats && playerStats.length > 0 && <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Performance des joueurs</p><h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Statistiques individuelles</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs uppercase text-[var(--ink-soft)]"><tr className="text-left"><th className="py-2">Joueur</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>+/-</th></tr></thead>
            <tbody>{playerStats.map((stat) => <tr key={stat.id} className="border-t border-[var(--line)]"><td className="py-2 font-semibold">#{stat.player.jersey_number} {stat.player.first_name} {stat.player.last_name}</td><td>{stat.minutes_played}</td><td className="font-bold">{stat.points}</td><td>{stat.rebounds}</td><td>{stat.assists}</td><td className={stat.plus_minus >= 0 ? 'text-[var(--gold-deep)]' : 'text-[var(--maroon-700)]'}>{stat.plus_minus > 0 ? '+' : ''}{stat.plus_minus}</td></tr>)}</tbody>
          </table></div>
        </section>}

        {rankStats && !teamStats.length && !playerStats.length && <p className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Les statistiques détaillées de ce match seront publiées après validation.</p>}
        {rankStats && <p className="text-right text-xs text-[var(--ink-soft)]">Match du {shortDate(match.scheduled_at)}</p>}
      </main>
    </>
  )
}
