import Link from 'next/link'
import PublicNav from '@/components/PublicNav'
import SeasonSelect from '@/components/SeasonSelect'
import TeamBanner from '@/components/TeamBanner'
import TeamLeaders from '@/components/TeamLeaders'
import TeamLogo from '@/components/TeamLogo'
import EmptyState from '@/components/ui/EmptyState'
import { nameCase } from '@/lib/format'
import { playerCardInfo } from '@/lib/data/player-card'
import type { MatchRow, StandingRow, Team, TeamPageData } from '@/lib/data/public'
import { formatAverage, toLine } from '@/lib/stats/player-stats'
import { marginChart, signed } from '@/lib/stats/season-review'
import { buildLeaderPlayer, type LeaderPlayer } from '@/lib/stats/team-leaders'

/*
 * Page de l'ESI : bannière, bilan, forme récente, écart de points, leaders filtrables,
 * classement complet puis historique des matchs.
 */

const sectionTitle = 'font-display text-3xl leading-none text-brand'
const card = 'rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4'
const teamLabel = (team: Pick<Team, 'name' | 'is_esi'>) => (team.is_esi ? 'ESI' : team.name)

type Result = { match: MatchRow; label: string; opponent: string; mine: number; theirs: number; won: boolean }

function toResult(teamId: string, match: MatchRow, index: number): Result {
  const home = match.home_team.id === teamId
  const mine = (home ? match.home_score : match.away_score) ?? 0
  const theirs = (home ? match.away_score : match.home_score) ?? 0
  return {
    match, label: match.round_number ? `J${match.round_number}` : `M${index + 1}`,
    opponent: teamLabel(home ? match.away_team : match.home_team), mine, theirs, won: mine > theirs,
  }
}

const badge = (won: boolean) => (won ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]')

export default function EsiSeasonReview({ data, standings }: { data: TeamPageData; standings: StandingRow[] }) {
  const { team, season, seasons, seasonCompletedMatches, players, playerStats } = data

  // Matchs de la saison dans l'ordre : J1 en premier.
  const results = [...seasonCompletedMatches]
    .sort((a, b) => (a.round_number ?? Number.MAX_SAFE_INTEGER) - (b.round_number ?? Number.MAX_SAFE_INTEGER) || a.scheduled_at.localeCompare(b.scheduled_at))
    .map((match, index) => toResult(team.id, match, index))
  const played = results.length
  const wins = results.filter((result) => result.won).length
  const losses = played - wins
  const pointsFor = results.reduce((total, result) => total + result.mine, 0)
  const pointsAgainst = results.reduce((total, result) => total + result.theirs, 0)
  const perMatch = (value: number) => (played ? formatAverage(value / played) : '—')
  const row = standings.find((item) => item.team_id === team.id)
  const form = results.slice(-5)
  const chart = marginChart(results.map((result) => result.mine - result.theirs))

  const leaders = players.flatMap((player) => {
    const info = playerCardInfo(player)
    const lines = playerStats.filter((stat) => stat.player_id === player.id).map(toLine)
    return buildLeaderPlayer({ id: player.id, name: nameCase(`${info.first_name} ${info.last_name}`), position: info.position ?? '' }, lines) ?? []
  }) satisfies LeaderPlayer[]

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-28 pt-5 sm:px-6">
        <Link href="/classement" className="inline-flex min-h-10 items-center gap-1 rounded text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">‹ Classement</Link>

        <TeamBanner team="esi" season={season?.name ?? '2026-2027'} />
        <div className="flex justify-start"><SeasonSelect seasons={seasons} current={season?.id ?? null} /></div>

        {played === 0 ? (
          <EmptyState title="Aucun match joué" description="Le bilan de la saison apparaîtra dès les premiers résultats officiels." />
        ) : (
          <>
            <section aria-label="Bilan de la saison" className="rounded-2xl bg-maroon-panel p-5 text-on-brand">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] opacity-80">Saison {season?.name} · après {played} journée{played > 1 ? 's' : ''}</p>
              <div className="mt-3 flex items-end gap-5">
                <p className="flex items-end gap-1.5"><span className="font-display text-7xl leading-[0.85] tabular-nums">{wins}</span><span className="pb-1 text-sm font-bold tracking-[0.1em]">Victoire{wins > 1 ? 's' : ''}</span></p>
                <p className="flex items-end gap-1.5 opacity-75"><span className="font-display text-7xl leading-[0.85] tabular-nums">{losses}</span><span className="pb-1 text-sm font-bold tracking-[0.1em]">Défaite{losses > 1 ? 's' : ''}</span></p>
                {row && <p className="ml-auto text-right">
                  <span className="block font-display text-5xl leading-[0.9] text-[var(--gold-500)]">{row.rank}<sup className="text-xl">{row.rank === 1 ? 'er' : 'e'}</sup></span>
                  <span className="text-[11px] font-bold tracking-[0.1em] opacity-80">SUR {standings.length}</span>
                </p>}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/20 text-center">
                {([['Marqués', perMatch(pointsFor), false], ['Encaissés', perMatch(pointsAgainst), false], ['Écart', played ? signed((pointsFor - pointsAgainst) / played, 1) : '—', true]] as const).map(([label, value, gold]) => (
                  <div key={label} className="bg-black/15 px-1.5 py-2.5">
                    <dd className={`font-display text-3xl leading-none tabular-nums ${gold ? 'text-[var(--gold-500)]' : ''}`}>{value}</dd>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-80">{label}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs opacity-75">Moyennes par match</p>
            </section>

            <section aria-labelledby="form-title" className="grid gap-2.5">
              <h2 id="form-title" className={sectionTitle}>Forme récente</h2>
              <div className={`${card} flex justify-around gap-1`}>
                {form.map((result) => (
                  <Link key={result.match.id} href={`/matchs/${result.match.id}`} className="grid min-w-0 flex-1 justify-items-center gap-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
                    <span className={`grid size-11 place-items-center rounded-full text-base font-extrabold ${badge(result.won)}`}><span className="sr-only">{result.won ? 'Victoire' : 'Défaite'} </span>{result.won ? 'V' : 'D'}</span>
                    <span className="font-display text-xl leading-none text-brand">{result.label}</span>
                    <span className="max-w-full truncate text-xs font-bold text-[var(--ink-soft)]">{result.opponent}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="margin-title" className="grid gap-2.5">
              <h2 id="margin-title" className={sectionTitle}>Écart de points par match</h2>
              <p className="-mt-1 text-sm text-[var(--ink-soft)]">Vers le haut : victoire. Vers le bas : défaite.</p>
              <div className={`${card} !p-2`}>
                <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="mx-auto w-full max-w-[30rem]" role="img"
                  aria-label={`Écart de points par match : ${results.map((result) => `${result.label} ${signed(result.mine - result.theirs)}`).join(', ')}`}>
                  <line x1="8" y1={chart.zeroY} x2={chart.width - 8} y2={chart.zeroY} stroke="var(--ink-soft)" strokeWidth="1.5" />
                  {chart.bars.map((bar, index) => (
                    <g key={results[index].match.id}>
                      <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="5"
                        fill={bar.margin < 0 ? 'var(--danger)' : index === chart.bars.length - 1 ? 'var(--gold-500)' : 'var(--primary)'} />
                      <text x={bar.centerX} y={bar.valueY} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)">{signed(bar.margin)}</text>
                      <text x={bar.centerX} y={chart.labelY} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink-soft)" letterSpacing="1">{results[index].label}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </section>
          </>
        )}

        <section aria-labelledby="leaders-title" className="grid gap-2.5">
          <h2 id="leaders-title" className={sectionTitle}>Leaders de l’équipe</h2>
          <TeamLeaders key={season?.id ?? 'sans-saison'} players={leaders} />
        </section>

        <section aria-labelledby="standings-title" className="grid gap-2.5">
          <h2 id="standings-title" className={sectionTitle}>Classement complet</h2>
          {standings.length ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[var(--neutral-bg)] text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--ink-soft)]">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-left">Équipe</th>
                    {['Joués', 'Gagnés', 'Perdus', 'Écart', 'Points'].map((heading) => <th key={heading} scope="col" className={`px-1.5 py-2.5 text-right sm:px-2 ${heading === 'Joués' ? 'hidden sm:table-cell' : ''}`}>{heading}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((item) => {
                    const mine = item.team_id === team.id
                    const difference = item.points_for - item.points_against
                    return (
                      <tr key={item.team_id} className={`border-t border-[var(--line)] tabular-nums ${mine ? 'bg-[var(--gold-soft)] font-bold' : ''}`}>
                        <td className="px-3 py-3">
                          <Link href={`/equipes/${item.team_id}`} className="flex min-w-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
                            <span className={`w-5 flex-none font-bold ${mine ? 'text-[var(--gold-deep)]' : 'text-[var(--ink-soft)]'}`}>{item.rank}</span>
                            <TeamLogo team={item.team} size={24} className="size-6 shrink-0 max-[375px]:hidden" />
                            <span className="truncate">{teamLabel(item.team)}</span>
                          </Link>
                        </td>
                        <td className="hidden px-2 py-3 text-right sm:table-cell">{item.played}</td>
                        <td className="px-1.5 py-3 text-right sm:px-2">{item.won}</td>
                        <td className="px-1.5 py-3 text-right sm:px-2">{item.lost}</td>
                        <td className="px-1.5 py-3 text-right sm:px-2">{signed(difference)}</td>
                        <td className="px-1.5 py-3 text-right font-extrabold text-brand sm:px-2">{item.ranking_points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="Le classement est vide" description="Le classement sera affiché dès que les équipes seront disponibles." />}
          <p className="text-xs text-[var(--ink-soft)]">Victoire : 2 points. Défaite : 1 point. Touche une équipe pour voir sa page.</p>
        </section>

        {played > 0 && (
          <section aria-labelledby="history-title" className="grid gap-2.5">
            <h2 id="history-title" className={sectionTitle}>Historique des matchs</h2>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2">
              {[...results].reverse().map((result) => (
                <Link key={result.match.id} href={`/matchs/${result.match.id}`}
                  className="flex min-h-16 items-center gap-3 border-t border-[var(--line)] px-2 py-2.5 first:border-t-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">vs {result.opponent}</span>
                    <span className="block text-sm text-[var(--ink-soft)]">{result.match.round_number ? `Journée ${result.match.round_number} · ` : ''}Terminé</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.06em] ${badge(result.won)}`}>{result.won ? 'V' : 'D'}</span>
                  <span className="font-display text-2xl leading-none text-brand tabular-nums">{result.mine}–{result.theirs}</span>
                  <span aria-hidden="true" className="text-xl text-[var(--ink-soft)]">›</span>
                </Link>
              ))}
            </div>
            <p className="text-xs text-[var(--ink-soft)]">Touche un match pour ouvrir sa feuille complète.</p>
          </section>
        )}
      </main>
    </>
  )
}
