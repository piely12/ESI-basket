import TeamLogo from '@/components/TeamLogo'
import type { MatchTeamStat, Team } from '@/lib/data/public'
import { withArticle } from '@/lib/push/match-reminder'

/*
 * Statistiques d'équipe en duel : pour chaque stat, la barre montre la part de
 * chaque équipe et le gagnant du duel est en couleur pleine. Pour les balles
 * perdues, c'est l'équipe qui en a le moins qui gagne. Une équipe dont les
 * stats n'ont pas été relevées affiche « — » et la barre reste neutre.
 */

type Side = { value: number | null; detail?: string }
type Duel = { label: string; home: Side; away: Side; percent?: boolean; lowerIsBetter?: boolean; note?: string }

const pctOf = (made: number | null | undefined, attempted: number | null | undefined): Side =>
  made == null || attempted == null || attempted === 0
    ? { value: null, detail: attempted === 0 ? '0 sur 0' : undefined }
    : { value: Math.round((made / attempted) * 100), detail: `${made} sur ${attempted}` }

const count = (value: number | null | undefined): Side => ({ value: value ?? null })

function DuelRow({ duel }: { duel: Duel }) {
  const { home, away } = duel
  const complete = home.value !== null && away.value !== null
  const sum = complete ? home.value! + away.value! : 0
  const homeShare = complete && sum > 0 ? (home.value! / sum) * 100 : 50
  const better = (a: number, b: number) => (duel.lowerIsBetter ? a < b : a > b)
  const homeWins = complete && better(home.value!, away.value!)
  const awayWins = complete && better(away.value!, home.value!)
  const tie = complete && home.value === away.value
  const fill = (wins: boolean) => (wins || tie ? 'bg-primary' : 'bg-[var(--neutral-bg)]')
  const shown = (side: Side) => (side.value === null ? '—' : duel.percent ? `${side.value} %` : side.value)

  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <span className={`font-display text-3xl leading-none tabular-nums ${homeWins ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]'}`}>{shown(home)}</span>
        <span className="pb-0.5 text-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{duel.label}</span>
        <span className={`text-right font-display text-3xl leading-none tabular-nums ${awayWins ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]'}`}>{shown(away)}</span>
      </div>
      <div className="flex h-2.5 gap-1" aria-hidden="true">
        <span className={`rounded-full ${complete ? fill(homeWins) : 'bg-[var(--neutral-bg)]'}`} style={{ width: `${homeShare}%` }} />
        <span className={`flex-1 rounded-full ${complete ? fill(awayWins) : 'bg-[var(--neutral-bg)]'}`} />
      </div>
      {(home.detail || away.detail || duel.note) && <div className="flex justify-between gap-2 text-xs text-[var(--ink-soft)] tabular-nums">
        <span>{home.detail ?? duel.note ?? ''}</span>
        <span>{away.detail ?? ''}</span>
      </div>}
    </div>
  )
}

export default function TeamStatsDuel({ homeTeam, awayTeam, homeScore, awayScore, stats }: {
  homeTeam: Team
  awayTeam: Team
  homeScore: number | null
  awayScore: number | null
  stats: MatchTeamStat[]
}) {
  const home = stats.find((stat) => stat.team_id === homeTeam.id)
  const away = stats.find((stat) => stat.team_id === awayTeam.id)
  const name = (team: Team) => (team.is_esi ? 'ESI' : team.name)

  const duels: Duel[] = [
    { label: 'Points', home: count(homeScore ?? home?.points), away: count(awayScore ?? away?.points) },
    { label: 'Rebonds', home: count(home?.rebounds), away: count(away?.rebounds) },
    { label: 'Passes', home: count(home?.assists), away: count(away?.assists) },
    { label: 'Interceptions', home: count(home?.steals), away: count(away?.steals) },
    { label: 'Balles perdues', home: count(home?.turnovers), away: count(away?.turnovers), lowerIsBetter: true, note: 'Moins de pertes : mieux' },
  ]
  const shooting: Duel[] = [
    { label: 'Tirs', home: pctOf(home?.fg_made, home?.fg_attempted), away: pctOf(away?.fg_made, away?.fg_attempted), percent: true },
    { label: '3 points', home: pctOf(home?.three_made, home?.three_attempted), away: pctOf(away?.three_made, away?.three_attempted), percent: true },
    { label: 'Lancers francs', home: pctOf(home?.ft_made, home?.ft_attempted), away: pctOf(away?.ft_made, away?.ft_attempted), percent: true },
  ]
  const missing = [!home && homeTeam, !away && awayTeam].filter(Boolean) as Team[]

  return (
    <section aria-labelledby="match-team-stats-title" className="grid gap-3">
      <div>
        <h2 id="match-team-stats-title" className="font-display text-3xl text-brand">Statistiques d’équipe</h2>
      </div>
      <div className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
          <span className="flex min-w-0 items-center gap-2"><TeamLogo team={homeTeam} size={28} /><span className="truncate">{name(homeTeam)}</span></span>
          <span className="flex min-w-0 items-center gap-2"><span className="truncate">{name(awayTeam)}</span><TeamLogo team={awayTeam} size={28} /></span>
        </div>
        {duels.map((duel) => <DuelRow key={duel.label} duel={duel} />)}
        <hr className="border-[var(--line)]" />
        {shooting.map((duel) => <DuelRow key={duel.label} duel={duel} />)}
        {missing.length > 0 && <p className="text-xs text-[var(--ink-soft)]">Statistiques {missing.map((team) => `de ${withArticle(name(team))}`).join(' et ')} non relevées pour ce match : seul le score est comparé.</p>}
      </div>
    </section>
  )
}
