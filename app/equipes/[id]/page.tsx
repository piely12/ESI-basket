import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicNav from '@/components/PublicNav'
import TeamLogo from '@/components/TeamLogo'
import MatchCard from '@/components/MatchCard'
import EmptyState from '@/components/ui/EmptyState'
import { getStandings, getTeamPageData } from '@/lib/data/public'

function StatValue({ value }: { value: number | null }) {
  return <>{value === null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</>
}

export default async function TeamPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string; round?: string; metric?: string; mode?: string }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const roundValue = query.round ? Number(query.round) : undefined
  const round = Number.isInteger(roundValue) && roundValue! > 0 && roundValue! <= 99 ? roundValue : undefined
  const period = 'all'
  const allowedMetrics = ['points', 'rebounds', 'assists', 'steals', 'blocks', 'fieldGoalPct'] as const
  const metric = allowedMetrics.find((value) => value === query.metric) ?? 'points'
  const mode = query.mode === 'total' ? 'total' : 'average'
  const data = await getTeamPageData(id, { seasonId: query.season, round, period })
  if (!data) notFound()
  const standings = await getStandings(data.season?.id)

  const row = standings.find((item) => item.team_id === id)
  const { team, season, seasons, matches, seasonCompletedMatches, completedMatches, upcomingMatches, players, playerStats, teamStats } = data
  const rounds = [...new Set(matches.map((match) => match.round_number).filter((value): value is number => value !== null))].sort((a, b) => a - b)
  const played = completedMatches.length
  const wins = completedMatches.filter((match) => team.id === match.home_team.id
    ? match.home_score! > match.away_score!
    : match.away_score! > match.home_score!).length
  const losses = played - wins
  const pointsFor = completedMatches.reduce((sum, match) => sum + (team.id === match.home_team.id ? match.home_score! : match.away_score!), 0)
  const pointsAgainst = completedMatches.reduce((sum, match) => sum + (team.id === match.home_team.id ? match.away_score! : match.home_score!), 0)
  const difference = pointsFor - pointsAgainst
  const average = (value: number) => played ? (value / played).toFixed(1) : '—'
  const latestWon = seasonCompletedMatches[0] ? (team.id === seasonCompletedMatches[0].home_team.id
    ? seasonCompletedMatches[0].home_score! > seasonCompletedMatches[0].away_score!
    : seasonCompletedMatches[0].away_score! > seasonCompletedMatches[0].home_score!) : null
  let currentStreak = 0
  if (latestWon !== null) {
    for (const match of seasonCompletedMatches) {
      const wonMatch = team.id === match.home_team.id ? match.home_score! > match.away_score! : match.away_score! > match.home_score!
      if (wonMatch !== latestWon) break
      currentStreak += 1
    }
  }
  const completeTeamStatTotal = (key: 'fg_made' | 'fg_attempted' | 'three_made' | 'three_attempted' | 'ft_made' | 'ft_attempted') => {
    if (!played || teamStats.length < played || teamStats.some((stat) => stat[key] === null)) return null
    return teamStats.reduce((sum, stat) => sum + (stat[key] ?? 0), 0)
  }
  const teamFgMade = completeTeamStatTotal('fg_made')
  const teamFgAttempted = completeTeamStatTotal('fg_attempted')
  const teamThreeMade = completeTeamStatTotal('three_made')
  const teamThreeAttempted = completeTeamStatTotal('three_attempted')
  const teamFtMade = completeTeamStatTotal('ft_made')
  const teamFtAttempted = completeTeamStatTotal('ft_attempted')
  const teamTwoMade = teamFgMade === null || teamThreeMade === null ? null : teamFgMade - teamThreeMade
  const teamTwoAttempted = teamFgAttempted === null || teamThreeAttempted === null ? null : teamFgAttempted - teamThreeAttempted
  const teamPct = (made: number | null, attempted: number | null) => made === null || !attempted ? '—' : `${(made / attempted * 100).toFixed(1)}%`

  const playerRows = players.map((player) => {
    const stats = playerStats.filter((stat) => stat.player_id === player.id)
    const appearances = stats.filter((stat) => Number(stat.minutes_played ?? 0) > 0).length
    const sum = (key: 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'personal_fouls' | 'fg_made' | 'fg_attempted' | 'three_made' | 'three_attempted' | 'ft_made' | 'ft_attempted') => {
      const values = stats.map((stat) => stat[key]).filter((value): value is number => value !== null)
      return values.length === stats.length && values.length ? values.reduce((total, value) => total + value, 0) : null
    }
    const points = sum('points')
    const rebounds = sum('rebounds')
    const assists = sum('assists')
    const steals = sum('steals')
    const blocks = sum('blocks')
    const turnovers = sum('turnovers')
    const personalFouls = sum('personal_fouls')
    const made = sum('fg_made')
    const attempted = sum('fg_attempted')
    const threesMade = sum('three_made')
    const threesAttempted = sum('three_attempted')
    const freeThrowsMade = sum('ft_made')
    const freeThrowsAttempted = sum('ft_attempted')
    const twoMade = made === null || threesMade === null ? null : made - threesMade
    const twoAttempted = attempted === null || threesAttempted === null ? null : attempted - threesAttempted
    const pct = (makes: number | null, attempts: number | null) => makes === null || !attempts ? null : makes / attempts * 100
    return {
      player, appearances,
      pointsTotal: points, reboundsTotal: rebounds, assistsTotal: assists,
      stealsTotal: steals, blocksTotal: blocks, turnoversTotal: turnovers, personalFoulsTotal: personalFouls,
      pointsPerGame: points === null || !appearances ? null : points / appearances,
      reboundsPerGame: rebounds === null || !appearances ? null : rebounds / appearances,
      assistsPerGame: assists === null || !appearances ? null : assists / appearances,
      stealsPerGame: steals === null || !appearances ? null : steals / appearances,
      blocksPerGame: blocks === null || !appearances ? null : blocks / appearances,
      turnoversPerGame: turnovers === null || !appearances ? null : turnovers / appearances,
      personalFoulsPerGame: personalFouls === null || !appearances ? null : personalFouls / appearances,
      fieldGoalPct: pct(made, attempted), twoPointPct: pct(twoMade, twoAttempted),
      threePointPct: pct(threesMade, threesAttempted), freeThrowPct: pct(freeThrowsMade, freeThrowsAttempted),
    }
  })
  const totalMetric = { points: 'pointsTotal', rebounds: 'reboundsTotal', assists: 'assistsTotal', steals: 'stealsTotal', blocks: 'blocksTotal' } as const
  const averageMetric = { points: 'pointsPerGame', rebounds: 'reboundsPerGame', assists: 'assistsPerGame', steals: 'stealsPerGame', blocks: 'blocksPerGame' } as const
  const rankMetric = metric === 'fieldGoalPct' ? 'fieldGoalPct' : mode === 'total' ? totalMetric[metric] : averageMetric[metric]
  playerRows.sort((a, b) => (b[rankMetric] ?? -1) - (a[rankMetric] ?? -1))

  const teamStat = (key: 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'personal_fouls') => {
    if (!played || teamStats.length < played || teamStats.some((stat) => stat[key] === null)) return null
    return teamStats.reduce((total, stat) => total + (stat[key] ?? 0), 0)
  }
  const teamStatsIncomplete = teamStats.length < played || teamStats.some((stat) => [
    stat.rebounds, stat.assists, stat.steals, stat.blocks, stat.turnovers, stat.personal_fouls,
  ].some((value) => value === null))

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-screen-xl space-y-7 px-4 pb-28 pt-7 sm:px-6 lg:px-10">
        <Link href="/classement" className="inline-flex min-h-10 items-center gap-2 rounded font-semibold text-[var(--maroon-700)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">
          Retour au classement
        </Link>

        <header className="rounded-2xl bg-[var(--maroon-900)] p-5 text-white shadow-md sm:p-7 lg:p-9">
          <div className="flex items-center gap-4 sm:gap-6">
            <TeamLogo team={team} size={112} className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-500)]">{season?.name ?? 'Saison en cours'}</p>
              <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl lg:text-6xl">{team.is_esi ? 'ESI Basketball' : team.name}</h1>
            </div>
          </div>
        </header>

        <form method="get" className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Saison
            <select name="season" defaultValue={season?.id ?? ''} className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-sm font-semibold normal-case tracking-normal text-[var(--ink)]">
              {seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Journée
            <select name="round" defaultValue={query.round ?? ''} className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-sm font-semibold normal-case tracking-normal text-[var(--ink)]">
              <option value="">Toutes les journées</option>{rounds.map((value) => <option key={value} value={value}>Journée {value}</option>)}
            </select>
          </label>
          {team.is_esi && <>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Classement par
              <select name="metric" defaultValue={metric} className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-sm font-semibold normal-case tracking-normal text-[var(--ink)]">
                <option value="points">Points</option><option value="rebounds">Rebonds</option>
                <option value="assists">Passes</option><option value="steals">Interceptions</option>
                <option value="blocks">Contres</option><option value="fieldGoalPct">Réussite aux tirs</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Valeurs affichées
              <select name="mode" defaultValue={mode} className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-sm font-semibold normal-case tracking-normal text-[var(--ink)]">
                <option value="average">Moyennes par match joué</option><option value="total">Cumul de la période</option>
              </select>
            </label>
          </>}
          <div className="flex gap-2">
            <button type="submit" className="min-h-11 flex-1 rounded-lg bg-[var(--maroon-900)] px-4 text-sm font-bold text-white">Appliquer</button>
            <Link href={`/equipes/${id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--maroon-900)]">Réinitialiser</Link>
          </div>
        </form>

        <section aria-label={round !== undefined || period !== 'all' ? 'Bilan de la sélection' : 'Bilan de la saison'} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <h2 className="col-span-full font-display text-2xl text-[var(--maroon-900)]">{round !== undefined || period !== 'all' ? 'Bilan de la sélection' : 'Bilan de la saison'}</h2>
          {[
            ['Classement', row ? `${row.rank}${row.rank === 1 ? 'er' : 'e'}` : '—'],
            ['Matchs joués', played], ['Victoires · défaites', `${wins} · ${losses}`],
            ['Points classement', row?.ranking_points ?? 0], ['Points marqués', pointsFor],
            ['Points encaissés', pointsAgainst], ['Différence', difference > 0 ? `+${difference}` : difference],
            ['Victoire', `${played ? Math.round(wins / played * 100) : 0}%`],
            ['Points / match', average(pointsFor)], ['Encaissés / match', average(pointsAgainst)],
            [latestWon === null ? 'Série' : latestWon ? 'Série de victoires' : 'Série de défaites', latestWon === null ? '—' : currentStreak],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
            <p className="font-display text-2xl leading-none text-[var(--maroon-900)] sm:text-3xl">{value}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs">{label}</p>
          </div>)}
        </section>

        <section className="grid gap-7 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Dernier match</h2>
            {completedMatches[0] ? <MatchCard match={completedMatches[0]} large /> : <EmptyState title="Aucun match joué" description="Les résultats officiels de cette équipe apparaîtront ici." />}
          </div>
          <div>
            <h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Prochaines rencontres</h2>
            {upcomingMatches.length ? <div className="space-y-3">{upcomingMatches.slice(0, 3).map((match) => <MatchCard key={match.id} match={match} />)}</div>
              : <EmptyState title="Aucun match programmé" description="Les prochaines rencontres apparaîtront ici dès leur ajout au calendrier." />}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Statistiques collectives</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Rebonds totaux', teamStat('rebounds')], ['Passes totales', teamStat('assists')], ['Interceptions', teamStat('steals')],
              ['Contres', teamStat('blocks')], ['Balles perdues', teamStat('turnovers')], ['Fautes', teamStat('personal_fouls')],
              ['Tirs réussis', teamPct(teamFgMade, teamFgAttempted)], ['Tirs à 2 points', teamPct(teamTwoMade, teamTwoAttempted)],
              ['Tirs à 3 points', teamPct(teamThreeMade, teamThreeAttempted)], ['Lancers francs', teamPct(teamFtMade, teamFtAttempted)],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="font-display text-2xl text-[var(--maroon-900)]">{typeof value === 'number' ? <StatValue value={value} /> : value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs">{label}</p>
            </div>)}
          </div>
          {teamStatsIncomplete && <p className="mt-2 text-xs text-[var(--ink-soft)]">Certaines statistiques collectives ne sont pas encore publiées pour tous les matchs de la période affichée.</p>}
        </section>

        {team.is_esi && <>
          {players.length > 0 && <section>
            <h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Statistiques individuelles</h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--line)]/35 text-left text-xs uppercase text-[var(--ink-soft)]"><tr>
                  {['Joueur', 'MJ', mode === 'total' ? 'PTS' : 'PTS / MJ', mode === 'total' ? 'REB' : 'REB / MJ', mode === 'total' ? 'AST' : 'AST / MJ', mode === 'total' ? 'INT' : 'INT / MJ', mode === 'total' ? 'CTR' : 'CTR / MJ', mode === 'total' ? 'BP' : 'BP / MJ', mode === 'total' ? 'Fautes' : 'Fautes / MJ', 'Tirs', '2PT', '3PT', 'LF'].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}
                </tr></thead>
                <tbody>{playerRows.map((row) => <tr key={row.player.id} className="border-t border-[var(--line)]">
                  <td className="px-3 py-3"><Link href={`/equipe/${row.player.id}`} className="font-semibold text-[var(--maroon-700)] hover:underline">{row.player.first_name} {row.player.last_name}</Link></td>
                  <td className="px-3 py-3 tabular-nums">{row.appearances}</td>
                  {[
                    mode === 'total' ? row.pointsTotal : row.pointsPerGame,
                    mode === 'total' ? row.reboundsTotal : row.reboundsPerGame,
                    mode === 'total' ? row.assistsTotal : row.assistsPerGame,
                    mode === 'total' ? row.stealsTotal : row.stealsPerGame,
                    mode === 'total' ? row.blocksTotal : row.blocksPerGame,
                    mode === 'total' ? row.turnoversTotal : row.turnoversPerGame,
                    mode === 'total' ? row.personalFoulsTotal : row.personalFoulsPerGame,
                  ].map((value, index) => <td key={index} className="px-3 py-3 tabular-nums">{value === null ? '—' : value.toFixed(1)}</td>)}
                  <td className="px-3 py-3 tabular-nums">{row.fieldGoalPct === null ? '—' : `${row.fieldGoalPct.toFixed(1)}%`}</td>
                  {[row.twoPointPct, row.threePointPct, row.freeThrowPct].map((value, index) => <td key={index} className="px-3 py-3 tabular-nums">{value === null ? '—' : `${value.toFixed(1)}%`}</td>)}
                </tr>)}</tbody>
              </table>
            </div>
            {!playerStats.length && <p className="mt-2 text-xs text-[var(--ink-soft)]">Les moyennes seront calculées dès la publication des premières feuilles de match.</p>}
          </section>}
        </>}

        <section>
          <h2 className="mb-3 font-display text-3xl text-[var(--maroon-900)]">Historique des matchs</h2>
          {completedMatches.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{completedMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
            : <EmptyState title="Aucun résultat pour cette saison" description="L’historique sera alimenté par les rencontres terminées et leurs scores officiels." />}
        </section>
      </main>
    </>
  )
}
