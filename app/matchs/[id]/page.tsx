import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicNav from '@/components/PublicNav'
import CompositionBoard from '@/components/CompositionBoard'
import MatchCard from '@/components/MatchCard'
import MatchStatsSheet from '@/components/MatchStatsSheet'
import TeamStatsDuel from '@/components/TeamStatsDuel'
import TeamLogo from '@/components/TeamLogo'
import { getMatchById, type MatchRow, type Team } from '@/lib/data/public'
import { formatMatchDate, shortDate } from '@/lib/format'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getMatchById(id)
  if (!result) notFound()
  const { match, teamStats, playerStats, lineups, compositionPublished, coachName, standings, teamHistory, mvpPlayerId } = result
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
        <MatchCard match={match} large />

        {isEsiMatch && !(rankStats && !starters.length) && <section id="composition" aria-label="Composition ESI" className="scroll-mt-20 sm:scroll-mt-28">
          {!lineupVisible ? <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
            <div className="font-display text-5xl text-[var(--ink-soft)]">N/A</div>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">La composition sera dévoilée le jour du match.</p>
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

        {rankStats && playerStats.length > 0 && <MatchStatsSheet stats={playerStats} mvpPlayerId={mvpPlayerId} roundNumber={match.round_number} />}
        {rankStats && teamStats.length > 0 && <TeamStatsDuel homeTeam={match.home_team} awayTeam={match.away_team} homeScore={match.home_score} awayScore={match.away_score} stats={teamStats} />}
        {rankStats && !playerStats.length && !teamStats.length && <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Les statistiques détaillées de ce match seront publiées après validation.</p>}


        <section aria-labelledby="match-standings-title" className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 id="match-standings-title" className="mb-3 font-display text-3xl text-brand">Classement</h2>
          {standings.length ? <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Classement, défilement horizontal" tabIndex={0}>
            <table className="w-full min-w-[480px] border-separate border-spacing-0 text-sm tabular-nums">
              <thead className="text-xs uppercase tracking-wide text-[var(--ink-soft)]"><tr>
                <th scope="col" className="sticky left-0 z-10 w-10 bg-[var(--surface)] px-2 py-2 text-left">Rang</th>
                <th scope="col" className="sticky left-10 z-10 bg-[var(--surface)] px-2 py-2 text-left shadow-[1px_0_0_var(--line)]">Équipe</th>
                <th scope="col" className="px-2 py-2 text-right">MJ</th><th scope="col" className="px-2 py-2 text-right">V</th><th scope="col" className="px-2 py-2 text-right">D</th><th scope="col" className="px-2 py-2 text-right">Pts</th><th scope="col" className="px-2 py-2 text-right">Diff.</th>
              </tr></thead>
              <tbody>{standings.map((row) => {
                const featured = row.team_id === match.home_team.id || row.team_id === match.away_team.id
                // Opaque background (also on the fixed columns) so numbers never show through while scrolling.
                const cell = `border-t border-[var(--line)] px-2 py-2 ${featured ? 'bg-[color-mix(in_oklch,var(--gold-500)_12%,var(--surface))] font-bold' : 'bg-[var(--surface)]'}`
                return <tr key={row.team_id}>
                  <td className={`${cell} sticky left-0 z-10 w-10`}>{row.rank}</td>
                  <th scope="row" className={`${cell} sticky left-10 z-10 text-left font-semibold shadow-[1px_0_0_var(--line)]`}><Link href={`/equipes/${row.team_id}`} className="flex w-fit items-center gap-2 rounded hover:underline"><TeamLogo team={row.team} size={28} /><span className="whitespace-nowrap">{row.team.is_esi ? 'ESI' : row.team.name}</span></Link></th>
                  <td className={`${cell} text-right`}>{row.played}</td><td className={`${cell} text-right`}>{row.won}</td><td className={`${cell} text-right`}>{row.lost}</td><td className={`${cell} text-right`}>{row.ranking_points}</td><td className={`${cell} text-right`}>{row.difference > 0 ? `+${row.difference}` : row.difference}</td>
                </tr>
              })}</tbody>
            </table>
          </div> : <p className="text-sm text-[var(--ink-soft)]">Le classement apparaîtra après l’enregistrement des premiers résultats.</p>}
        </section>

        <section aria-label="Historique des deux équipes" className="grid gap-5 lg:grid-cols-2">
          {teamHistory.map(({ team, matches: history }) => <TeamMatchHistory key={team.id} team={team} matches={history} />)}
        </section>

        {rankStats && <p className="text-right text-xs text-[var(--ink-soft)]">Match du {shortDate(match.scheduled_at)}</p>}
      </main>
    </>
  )
}

function TeamMatchHistory({ team, matches }: { team: Team; matches: MatchRow[] }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
      <h2 className="mb-3 font-display text-2xl text-brand">Derniers matchs · {team.is_esi ? 'ESI' : team.name}</h2>
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
            <span className="text-right"><span className="block font-display text-2xl tabular-nums text-brand">{teamScore} – {opponentScore}</span><span className={`text-[10px] font-bold uppercase tracking-wider ${tied ? 'text-[var(--ink-soft)]' : won ? 'text-emerald-700' : 'text-brand'}`}>{tied ? 'Nul' : won ? 'Victoire' : 'Défaite'}</span></span>
          </Link>
        </li>
      })}</ul> : <p className="text-sm text-[var(--ink-soft)]">Aucun résultat précédent enregistré.</p>}
    </section>
  )
}


