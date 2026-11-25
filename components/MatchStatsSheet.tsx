import Link from 'next/link'
import MatchBoxScore, { type BoxScoreRow, type BoxScoreTotal } from '@/components/MatchBoxScore'
import type { PublicMatchPlayerStat } from '@/lib/data/public'

/*
 * Feuille de match : MVP, leaders (points, rebonds, passes) et tableau des
 * joueurs triés par points. Chaque nom ouvre la fiche du joueur.
 */

const n = (value: number | null | undefined) => value ?? 0
const ratio = (made: number | null, attempted: number | null) => `${n(made)}/${n(attempted)}`
const fullName = (stat: PublicMatchPlayerStat) => `${stat.player.first_name} ${stat.player.last_name}`.trim()

function leader(stats: PublicMatchPlayerStat[], pick: (stat: PublicMatchPlayerStat) => number) {
  const best = Math.max(0, ...stats.map(pick))
  if (!best) return null
  return { value: best, names: stats.filter((stat) => pick(stat) === best).map(fullName) }
}

export default function MatchStatsSheet({ stats, mvpPlayerId }: { stats: PublicMatchPlayerStat[]; mvpPlayerId: string | null }) {
  const sorted = [...stats].sort((a, b) => n(b.points) - n(a.points)
    || (n(b.rebounds) + n(b.assists)) - (n(a.rebounds) + n(a.assists)))

  const rows: BoxScoreRow[] = sorted.map((stat) => ({
    id: stat.id,
    playerId: stat.player_id,
    name: fullName(stat),
    jersey: stat.player.jersey_number,
    isMvp: stat.player_id === mvpPlayerId,
    pts: n(stat.points), reb: n(stat.rebounds), ast: n(stat.assists),
    stl: n(stat.steals), blk: n(stat.blocks), tov: n(stat.turnovers), pf: n(stat.personal_fouls),
    fg: ratio(stat.fg_made, stat.fg_attempted),
    three: ratio(stat.three_made, stat.three_attempted),
    ft: ratio(stat.ft_made, stat.ft_attempted),
  }))

  const sum = (pick: (stat: PublicMatchPlayerStat) => number | null) => stats.reduce((total, stat) => total + n(pick(stat)), 0)
  const total: BoxScoreTotal = {
    pts: sum((s) => s.points), reb: sum((s) => s.rebounds), ast: sum((s) => s.assists),
    stl: sum((s) => s.steals), blk: sum((s) => s.blocks), tov: sum((s) => s.turnovers), pf: sum((s) => s.personal_fouls),
    fg: `${sum((s) => s.fg_made)}/${sum((s) => s.fg_attempted)}`,
    three: `${sum((s) => s.three_made)}/${sum((s) => s.three_attempted)}`,
    ft: `${sum((s) => s.ft_made)}/${sum((s) => s.ft_attempted)}`,
  }

  const leaders = [
    { label: 'Points', best: leader(stats, (s) => n(s.points)) },
    { label: 'Rebonds', best: leader(stats, (s) => n(s.rebounds)) },
    { label: 'Passes', best: leader(stats, (s) => n(s.assists)) },
  ]

  const mvp = sorted.find((stat) => stat.player_id === mvpPlayerId)
  const mvpLine = mvp ? [
    `${n(mvp.points)} pts`,
    n(mvp.rebounds) ? `${n(mvp.rebounds)} reb` : null,
    n(mvp.assists) ? `${n(mvp.assists)} passes` : null,
    n(mvp.fg_attempted) ? `${n(mvp.fg_made)}/${n(mvp.fg_attempted)} aux tirs` : null,
  ].filter(Boolean).join(' · ') : ''

  return (
    <section aria-labelledby="match-sheet-title" className="grid gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Performance des joueurs</p>
        <h2 id="match-sheet-title" className="font-display text-3xl text-brand">Feuille de match</h2>
      </div>

      {mvp && <Link href={`/equipe/${mvp.player_id}`} className="flex items-center gap-3 rounded-xl border border-[var(--gold-500)]/50 bg-[var(--gold-500)]/10 px-4 py-3 transition hover:border-[var(--gold-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
        <span className="shrink-0 rounded-md bg-gold px-2 pb-0.5 pt-1 font-display text-lg leading-none text-gold-foreground">MVP</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-[var(--ink)]">{fullName(mvp)}</span>
          <span className="block text-sm text-[var(--ink-soft)]">{mvpLine}</span>
        </span>
        <span aria-hidden="true" className="text-[var(--ink-soft)]">›</span>
      </Link>}

      <div className="grid grid-cols-3 gap-2">
        {leaders.map(({ label, best }) => (
          <div key={label} className="grid content-start gap-0.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-3 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--gold-deep)]">{label}</span>
            <span className="font-display text-4xl leading-none text-brand tabular-nums">{best?.value ?? '–'}</span>
            <span className="line-clamp-2 text-xs font-bold text-[var(--ink)]">{best ? best.names.join(' · ') : '—'}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
        <MatchBoxScore rows={rows} total={total} />
      </div>
    </section>
  )
}
