import { notFound } from 'next/navigation'
import PublicNav from '@/components/PublicNav'
import CompositionBoard from '@/components/CompositionBoard'
import MatchCard from '@/components/MatchCard'
import { getMatchById } from '@/lib/data/public'
import { pct, shortDate } from '@/lib/format'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getMatchById(id)
  if (!result) notFound()
  const { match, teamStats, playerStats, lineups, compositionPublished, coachName } = result
  const homeName = match.home_team.is_esi ? 'ESI' : match.home_team.name
  const awayName = match.away_team.is_esi ? 'ESI' : match.away_team.name
  const isEsiMatch = match.home_team.is_esi || match.away_team.is_esi
  const lineupVisible = compositionPublished || match.status === 'termine'
  const esiTeam = match.home_team.is_esi ? match.home_team : match.away_team
  const opponent = match.home_team.is_esi ? match.away_team : match.home_team
  const esiLineups = lineups.filter((lineup) => lineup.player.team_id === esiTeam.id)
  const starters = esiLineups.filter((lineup) => lineup.is_starter)
  const bench = esiLineups.filter((lineup) => !lineup.is_starter)
    .sort((a, b) => (a.player.jersey_number ?? 100) - (b.player.jersey_number ?? 100))
  const rankStats = match.status === 'termine'

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-6xl space-y-5 px-3 pb-28 pt-3 sm:px-5 sm:pt-4">
        {isEsiMatch && <section aria-label="Composition ESI">
          {!lineupVisible ? <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
            <div className="font-display text-5xl text-[var(--ink-soft)]">N/A</div>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">La composition sera dévoilée le jour du match.</p>
          </div> : starters.length ? <CompositionBoard
            team={esiTeam}
            opponent={opponent}
            scheduledAt={match.scheduled_at}
            location={match.location}
            coachName={coachName}
            starters={starters}
            bench={bench}
          /> : <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Composition en attente de validation.</p>}
        </section>}

        <MatchCard match={match} large />

        {rankStats && teamStats.length > 0 && <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Comparaison</p><h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Statistiques d’équipe</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm">
            <thead className="text-xs uppercase text-[var(--ink-soft)]"><tr className="text-left"><th className="py-2">Équipe</th><th>PTS</th><th>REB</th><th>AST</th><th>TIRS</th><th>3PT</th><th>LF</th></tr></thead>
            <tbody>{teamStats.map((stat) => <tr key={stat.id} className="border-t border-[var(--line)]"><td className="py-2 font-semibold">{stat.team_id === match.home_team.id ? homeName : awayName}</td><td>{stat.points}</td><td>{stat.rebounds}</td><td>{stat.assists}</td><td>{stat.fg_made}/{stat.fg_attempted} ({pct(stat.fg_made, stat.fg_attempted)})</td><td>{stat.three_made}/{stat.three_attempted} ({pct(stat.three_made, stat.three_attempted)})</td><td>{stat.ft_made}/{stat.ft_attempted} ({pct(stat.ft_made, stat.ft_attempted)})</td></tr>)}</tbody>
          </table></div>
        </section>}

        {rankStats && playerStats.length > 0 && <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Performance des joueurs</p><h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Statistiques individuelles</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
            <thead className="text-xs uppercase text-[var(--ink-soft)]"><tr className="text-left"><th className="py-2">Joueur</th><th>MIN</th><th>PTS</th><th>REB</th><th>REB DEF</th><th>REB OFF</th><th>Fautes</th><th>AST</th></tr></thead>
            <tbody>{playerStats.map((stat) => <tr key={stat.id} className="border-t border-[var(--line)]"><td className="py-2 font-semibold">#{stat.player.jersey_number} {stat.player.first_name} {stat.player.last_name}</td><td>{stat.minutes_played}</td><td className="font-bold">{stat.points}</td><td>{stat.rebounds}</td><td>{stat.rebounds_defensive ?? '—'}</td><td>{stat.rebounds_offensive ?? '—'}</td><td>{stat.personal_fouls ?? '—'}</td><td>{stat.assists}</td></tr>)}</tbody>
          </table></div>
        </section>}

        {rankStats && !teamStats.length && !playerStats.length && <p className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Les statistiques détaillées de ce match seront publiées après validation.</p>}
        {rankStats && <p className="text-right text-xs text-[var(--ink-soft)]">Match du {shortDate(match.scheduled_at)}</p>}
      </main>
    </>
  )
}
