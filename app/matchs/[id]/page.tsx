import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicNav from '@/components/PublicNav'
import CompositionBoard from '@/components/CompositionBoard'
import MatchCard from '@/components/MatchCard'
import TeamLogo from '@/components/TeamLogo'
import { getMatchById, type MatchRow, type Team } from '@/lib/data/public'
import { formatMatchDate, pct, shortDate } from '@/lib/format'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getMatchById(id)
  if (!result) notFound()
  const { match, teamStats, playerStats, lineups, compositionPublished, coachName, standings, teamHistory } = result
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
        <Link href="/matchs" className="inline-flex min-h-9 items-center gap-2 rounded text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">
          Retour au calendrier
        </Link>
        <MatchCard match={match} large showShare />

        {isEsiMatch && <section aria-label="Composition ESI">
          {!lineupVisible ? <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
            <div className="font-display text-5xl text-[var(--ink-soft)]">N/A</div>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">La composition sera dÃ©voilÃ©e le jour du match.</p>
          </div> : starters.length ? <CompositionBoard
            matchId={match.id}
            team={esiTeam}
            opponent={opponent}
            scheduledAt={match.scheduled_at}
            location={match.location}
            coachName={coachName}
            starters={starters}
            bench={bench}
          /> : <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Composition en attente de validation.</p>}
        </section>}

        <section aria-labelledby="match-standings-title" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Saison du match</p>
              <h2 id="match-standings-title" className="font-display text-3xl text-brand">Classement</h2>
            </div>
            <Link href="/classement" className="shrink-0 text-sm font-semibold text-brand underline underline-offset-4">Classement complet</Link>
          </div>
          {standings.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[var(--ink-soft)]"><tr>
                <th className="px-2 py-2">Rang</th><th className="px-2 py-2">Ã‰quipe</th><th className="px-2 py-2">MJ</th><th className="px-2 py-2">V</th><th className="px-2 py-2">D</th><th className="px-2 py-2">Pts</th><th className="px-2 py-2">Diff.</th>
              </tr></thead>
              <tbody>{standings.map((row) => {
                const featured = row.team_id === match.home_team.id || row.team_id === match.away_team.id
                return <tr key={row.team_id} className={`border-t border-[var(--line)] ${featured ? 'bg-[var(--gold-500)]/10 font-bold' : ''}`}>
                  <td className="px-2 py-2 tabular-nums">{row.rank}</td>
                  <td className="px-2 py-2"><Link href={`/equipes/${row.team_id}`} className="flex w-fit items-center gap-2 rounded hover:underline"><TeamLogo team={row.team} size={28} /><span>{row.team.is_esi ? 'ESI' : row.team.name}</span></Link></td>
                  <td className="px-2 py-2 tabular-nums">{row.played}</td><td className="px-2 py-2 tabular-nums">{row.won}</td><td className="px-2 py-2 tabular-nums">{row.lost}</td><td className="px-2 py-2 tabular-nums">{row.ranking_points}</td><td className="px-2 py-2 tabular-nums">{row.difference > 0 ? `+${row.difference}` : row.difference}</td>
                </tr>
              })}</tbody>
            </table>
          </div> : <p className="text-sm text-[var(--ink-soft)]">Le classement apparaÃ®tra aprÃ¨s lâ€™enregistrement des premiers rÃ©sultats.</p>}
        </section>

        <section aria-label="Historique des deux Ã©quipes" className="grid gap-5 lg:grid-cols-2">
          {teamHistory.map(({ team, matches: history }) => <TeamMatchHistory key={team.id} team={team} matches={history} />)}
        </section>

        {rankStats && teamStats.length > 0 && <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Comparaison</p><h2 className="mb-3 font-display text-3xl text-brand">Statistiques dâ€™Ã©quipe</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm">
            <thead className="text-xs uppercase text-[var(--ink-soft)]"><tr className="text-left"><th className="py-2">Ã‰quipe</th><th>PTS</th><th>REB</th><th>AST</th><th>TIRS</th><th>3PT</th><th>LF</th></tr></thead>
            <tbody>{teamStats.map((stat) => <tr key={stat.id} className="border-t border-[var(--line)]"><td className="py-2 font-semibold">{stat.team_id === match.home_team.id ? homeName : awayName}</td><td>{stat.points}</td><td>{stat.rebounds}</td><td>{stat.assists}</td><td>{stat.fg_made}/{stat.fg_attempted} ({pct(stat.fg_made, stat.fg_attempted)})</td><td>{stat.three_made}/{stat.three_attempted} ({pct(stat.three_made, stat.three_attempted)})</td><td>{stat.ft_made}/{stat.ft_attempted} ({pct(stat.ft_made, stat.ft_attempted)})</td></tr>)}</tbody>
          </table></div>
        </section>}

        {rankStats && playerStats.length > 0 && <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Performance des joueurs</p><h2 className="mb-3 font-display text-3xl text-brand">Statistiques individuelles</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
            <thead className="text-xs uppercase text-[var(--ink-soft)]"><tr className="text-left"><th className="py-2">Joueur</th><th>MIN</th><th>PTS</th><th>REB</th><th>REB DEF</th><th>REB OFF</th><th>Fautes</th><th>AST</th></tr></thead>
            <tbody>{playerStats.map((stat) => <tr key={stat.id} className="border-t border-[var(--line)]"><td className="py-2 font-semibold">#{stat.player.jersey_number} {stat.player.first_name} {stat.player.last_name}</td><td>{stat.minutes_played}</td><td className="font-bold">{stat.points}</td><td>{stat.rebounds}</td><td>{stat.rebounds_defensive ?? 'â€”'}</td><td>{stat.rebounds_offensive ?? 'â€”'}</td><td>{stat.personal_fouls ?? 'â€”'}</td><td>{stat.assists}</td></tr>)}</tbody>
          </table></div>
        </section>}

        {rankStats && !teamStats.length && !playerStats.length && <p className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Les statistiques dÃ©taillÃ©es de ce match seront publiÃ©es aprÃ¨s validation.</p>}
        {rankStats && <p className="text-right text-xs text-[var(--ink-soft)]">Match du {shortDate(match.scheduled_at)}</p>}
      </main>
    </>
  )
}

function TeamMatchHistory({ team, matches }: { team: Team; matches: MatchRow[] }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
      <h2 className="mb-3 font-display text-2xl text-brand">Derniers matchs Â· {team.is_esi ? 'ESI' : team.name}</h2>
      {matches.length ? <ul className="space-y-2">{matches.map((historyMatch) => {
        const isHome = historyMatch.home_team.id === team.id
        const opponentTeam = (isHome ? historyMatch.away_team : historyMatch.home_team) as Team
        const teamScore = isHome ? historyMatch.home_score : historyMatch.away_score
        const opponentScore = isHome ? historyMatch.away_score : historyMatch.home_score
        const won = (teamScore ?? 0) > (opponentScore ?? 0)
        const tied = teamScore === opponentScore
        return <li key={historyMatch.id}>
          <Link href={`/matchs/${historyMatch.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2 transition hover:border-[var(--gold-deep)] hover:bg-[var(--paper)]">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{formatMatchDate(historyMatch.scheduled_at, false)}</span>
              <span className="mt-1 flex min-w-0 items-center gap-2"><TeamLogo team={opponentTeam} size={28} /><span className="truncate font-semibold">{opponentTeam.is_esi ? 'ESI' : opponentTeam.name}</span></span>
            </span>
            <span className="text-right"><span className="block font-display text-2xl tabular-nums text-brand">{teamScore} â€“ {opponentScore}</span><span className={`text-[10px] font-bold uppercase tracking-wider ${tied ? 'text-[var(--ink-soft)]' : won ? 'text-emerald-700' : 'text-brand'}`}>{tied ? 'Nul' : won ? 'Victoire' : 'DÃ©faite'}</span></span>
          </Link>
        </li>
      })}</ul> : <p className="text-sm text-[var(--ink-soft)]">Aucun rÃ©sultat prÃ©cÃ©dent enregistrÃ©.</p>}
    </section>
  )
}


