import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicNav from '@/components/PublicNav'
import PlayerCardVisual from '@/components/PlayerCardVisual'
import { getPlayerProfile } from '@/lib/data/public'

export default async function PlayerPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string; round?: string }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const roundValue = query.round ? Number(query.round) : undefined
  const round = Number.isInteger(roundValue) && roundValue! > 0 && roundValue! <= 99 ? roundValue : undefined
  const period = 'all'
  const result = await getPlayerProfile(id, { seasonId: query.season, round, period })
  if (!result) notFound()
  const { player, season, seasons, seasonStats, stats } = result
  const rounds = [...new Set(seasonStats.map((stat) => stat.match?.round_number).filter((value): value is number => value !== null && value !== undefined))].sort((a, b) => a - b)
  const played = stats.filter((stat) => Number(stat.minutes_played ?? 0) > 0)
  type TotalKey = 'minutes_played' | 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'personal_fouls' | 'fg_made' | 'fg_attempted' | 'three_made' | 'three_attempted' | 'ft_made' | 'ft_attempted'
  const total = (key: TotalKey): number | null => {
    const values = stats.map((stat) => stat[key]).filter((value): value is number => typeof value === 'number')
    return values.length === stats.length && values.length ? values.reduce((sum, value) => sum + value, 0) : null
  }
  const average = (key: TotalKey) => {
    const value = total(key)
    return value === null || !played.length ? '—' : (value / played.length).toFixed(1)
  }
  const made = total('fg_made')
  const attempted = total('fg_attempted')
  const threesMade = total('three_made')
  const threesAttempted = total('three_attempted')
  const freeThrowsMade = total('ft_made')
  const freeThrowsAttempted = total('ft_attempted')
  const twoMade = made === null || threesMade === null ? null : made - threesMade
  const twoAttempted = attempted === null || threesAttempted === null ? null : attempted - threesAttempted
  const percentage = (makes: number | null, attempts: number | null) => makes === null || !attempts ? '—' : `${(makes / attempts * 100).toFixed(1)}%`
  const summary = [
    ['Matchs joués', played.length], ['PTS / match', average('points')], ['REB / match', average('rebounds')],
    ['AST / match', average('assists')], ['Interceptions / match', average('steals')], ['Contres / match', average('blocks')],
    ['Balles perdues / match', average('turnovers')], ['Fautes / match', average('personal_fouls')],
    ['Tirs', percentage(made, attempted)], ['2 points', percentage(twoMade, twoAttempted)],
    ['3 points', percentage(threesMade, threesAttempted)], ['Lancers francs', percentage(freeThrowsMade, freeThrowsAttempted)],
  ]

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-screen-xl space-y-5 px-4 pb-28 pt-7 sm:px-6 lg:space-y-7 lg:px-10">
        <Link href="/equipe" className="inline-flex min-h-10 items-center gap-2 rounded text-sm font-semibold text-[var(--maroon-700)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">Effectif</Link>
        <PlayerCardVisual player={player} />
        <form method="get" className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Saison
            <select name="season" defaultValue={season?.id ?? ''} className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-sm font-semibold normal-case tracking-normal text-[var(--ink)]">{seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Journée
            <select name="round" defaultValue={query.round ?? ''} className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-sm font-semibold normal-case tracking-normal text-[var(--ink)]"><option value="">Toutes les journées</option>{rounds.map((value) => <option key={value} value={value}>Journée {value}</option>)}</select>
          </label>
          <div className="flex gap-2"><button type="submit" className="min-h-11 flex-1 rounded-lg bg-[var(--maroon-900)] px-4 text-sm font-bold text-white">Appliquer</button><Link href={`/equipe/${id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--maroon-900)]">Réinitialiser</Link></div>
        </form>
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-3" aria-label={`Statistiques de la saison ${season?.name ?? ''}`}>
          {summary.map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-center sm:p-4"><div className="font-display text-3xl text-[var(--maroon-900)] sm:text-4xl">{value}</div><div className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs">{label}</div></div>)}
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <h1 className="font-display text-3xl text-[var(--maroon-900)]">Historique des matchs {season ? `· ${season.name}` : ''}</h1>
          {stats.length ? <div className="mt-2 divide-y divide-[var(--line)]">
            {stats.map((stat) => {
              const esiIsHome = stat.match.home_team.is_esi
              const opponent = esiIsHome ? stat.match.away_team.name : stat.match.home_team.name
              const esiScore = esiIsHome ? stat.match.home_score : stat.match.away_score
              const opponentScore = esiIsHome ? stat.match.away_score : stat.match.home_score
              return <Link key={stat.id} href={`/matchs/${stat.match.id}`} className="flex flex-col gap-1 rounded py-3 hover:bg-[var(--line)]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold">vs {opponent}</p><p className="text-xs text-[var(--ink-soft)]">{new Date(stat.match.scheduled_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan', day: 'numeric', month: 'short', year: 'numeric' })} {esiScore !== null && opponentScore !== null ? `· ${esiScore}–${opponentScore}` : ''}</p></div>
                <p className="text-sm tabular-nums text-[var(--ink-soft)]">{stat.points ?? '—'} pts · {stat.rebounds ?? '—'} reb · {stat.assists ?? '—'} passes</p>
              </Link>
            })}
          </div> : <p className="mt-2 text-sm text-[var(--ink-soft)]">Aucun match joué pour le moment.</p>}
        </section>
      </main>
    </>
  )
}
