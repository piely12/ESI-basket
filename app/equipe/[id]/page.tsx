import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicNav from '@/components/PublicNav'
import PlayerCardVisual from '@/components/PlayerCardVisual'
import PlayerSeasonStats, { type SeasonTotals } from '@/components/PlayerSeasonStats'
import SeasonSelect from '@/components/SeasonSelect'
import { ShotRatio } from '@/components/MatchBoxScore'
import { getNextMatch, getPlayerProfile } from '@/lib/data/public'
import { formatMatchDate } from '@/lib/format'

const n = (value: number | null | undefined) => value ?? 0
const teamName = (team: { name: string; is_esi: boolean }) => (team.is_esi ? 'ESI' : team.name)

export default async function PlayerPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const [result, nextMatch] = await Promise.all([
    getPlayerProfile(id, { seasonId: query.season }),
    getNextMatch().catch(() => null),
  ])
  if (!result) notFound()
  const { player, season, seasons, stats, mvpMatchIds } = result

  // A match counts as played as soon as the player has a stat line,
  // even when minutes were not recorded on the match sheet.
  const sum = (pick: (stat: (typeof stats)[number]) => number | null) => stats.reduce((total, stat) => total + n(pick(stat)), 0)
  const totals: SeasonTotals = {
    played: stats.length,
    points: sum((s) => s.points),
    rebounds: sum((s) => s.rebounds),
    assists: sum((s) => s.assists),
    steals: sum((s) => s.steals),
    blocks: sum((s) => s.blocks),
    turnovers: sum((s) => s.turnovers),
    fouls: sum((s) => s.personal_fouls),
    twoMade: sum((s) => s.fg_made) - sum((s) => s.three_made),
    twoAttempted: sum((s) => s.fg_attempted) - sum((s) => s.three_attempted),
    threeMade: sum((s) => s.three_made),
    threeAttempted: sum((s) => s.three_attempted),
    ftMade: sum((s) => s.ft_made),
    ftAttempted: sum((s) => s.ft_attempted),
  }
  const upcoming = nextMatch && (!season || nextMatch.season_id === season.id) ? nextMatch : null

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-28 pt-5 sm:px-6">
        <Link href="/equipe" className="inline-flex min-h-10 items-center gap-1 rounded text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">‹ Effectif</Link>
        <PlayerCardVisual player={player} />

        <div className="flex justify-start">
          <SeasonSelect seasons={seasons} current={season?.id ?? null} />
        </div>

        <PlayerSeasonStats totals={totals} />

        <section aria-labelledby="match-log-title" className="grid gap-3">
          <h2 id="match-log-title" className="font-display text-3xl leading-none text-brand">Match par match</h2>

          {upcoming && <Link href={`/matchs/${upcoming.id}`} className="grid gap-1 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-3 opacity-75 transition hover:opacity-100">
            <span className="flex items-center justify-between gap-3">
              <span className="font-bold">{upcoming.round_number ? `J${upcoming.round_number} · ` : ''}vs {teamName(upcoming.home_team.is_esi ? upcoming.away_team : upcoming.home_team)}</span>
              <span className="rounded-md bg-[var(--neutral-bg)] px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-soft)]">À venir</span>
            </span>
            <span className="text-sm text-[var(--ink-soft)]">{formatMatchDate(upcoming.scheduled_at, upcoming.kickoff_confirmed)}{upcoming.location ? ` · ${upcoming.location}` : ''}</span>
          </Link>}

          {stats.length ? stats.map((stat) => {
            const match = stat.match
            const esiHome = match.home_team.is_esi
            const opponent = esiHome ? match.away_team : match.home_team
            const esiScore = esiHome ? match.home_score : match.away_score
            const opponentScore = esiHome ? match.away_score : match.home_score
            const hasScore = esiScore !== null && opponentScore !== null
            const won = hasScore && esiScore! > opponentScore!
            const isMvp = mvpMatchIds.includes(match.id)
            return (
              <article key={stat.id} className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold">{match.round_number ? `J${match.round_number} · ` : ''}vs {teamName(opponent)}</h3>
                    <p className="text-xs text-[var(--ink-soft)]">{new Date(match.scheduled_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan', weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  </div>
                  {hasScore && <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-extrabold tabular-nums ${won ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'}`}>{won ? 'V' : 'D'} {esiScore}–{opponentScore}</span>}
                </header>

                <div className="flex items-end gap-5">
                  {([['PTS', stat.points], ['REB', stat.rebounds], ['PD', stat.assists]] as const).map(([label, value]) => (
                    <span key={label} className="grid">
                      <span className="font-display text-3xl leading-none text-brand tabular-nums">{n(value)}</span>
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]">{label}</span>
                    </span>
                  ))}
                  {isMvp && <span className="ml-auto self-center rounded-md bg-gold px-2 py-1 text-[11px] font-extrabold tracking-[0.08em] text-gold-foreground">MVP</span>}
                </div>

                <details className="group">
                  <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 text-sm font-bold text-brand [&::-webkit-details-marker]:hidden">
                    Détail du match <span aria-hidden="true" className="transition group-open:rotate-180">▾</span>
                  </summary>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    {([['2 pts', n(stat.fg_made) - n(stat.three_made), n(stat.fg_attempted) - n(stat.three_attempted)], ['3 pts', n(stat.three_made), n(stat.three_attempted)], ['LF', n(stat.ft_made), n(stat.ft_attempted)]] as const).map(([label, made, attempted]) => (
                      <span key={label} className="grid gap-1 rounded-lg bg-[var(--neutral-bg)] px-2 py-2 text-[var(--ink-soft)]">
                        {label}
                        <span className="text-sm text-[var(--ink)] [&>span]:mx-auto"><ShotRatio made={made} attempted={attempted} /></span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs font-bold">
                    {([['Int.', stat.steals], ['Contres', stat.blocks], ['B. perdues', stat.turnovers], ['Fautes', stat.personal_fouls]] as const).map(([label, value]) => (
                      <span key={label} className="grid gap-1 rounded-lg bg-[var(--neutral-bg)] px-2 py-2 text-[var(--ink-soft)]">
                        {label}
                        <span className="text-base text-[var(--ink)] tabular-nums">{n(value)}</span>
                      </span>
                    ))}
                  </div>
                  <Link href={`/matchs/${match.id}`} className="mt-3 inline-flex min-h-9 items-center text-sm font-extrabold text-brand hover:underline">Voir la feuille de match ›</Link>
                </details>
              </article>
            )
          }) : <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Aucun match joué cette saison pour le moment.</p>}
        </section>
      </main>
    </>
  )
}
