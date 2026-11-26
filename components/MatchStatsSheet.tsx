import Link from 'next/link'
import MatchBoxScore, { type BoxScoreRow, type BoxScoreValues } from '@/components/MatchBoxScore'
import type { PublicMatchPlayerStat } from '@/lib/data/public'
import { MVP_HEIGHT, MVP_WIDTH, mvpPoster } from '@/lib/data/mvp-images'

/*
 * MVP du match (affiche ou carte) puis tableau « Performance » des
 * joueurs triés par points. Chaque nom ouvre la fiche du joueur.
 */

const n = (value: number | null | undefined) => value ?? 0
const fullName = (stat: PublicMatchPlayerStat) => `${stat.player.first_name} ${stat.player.last_name}`.trim()


export default function MatchStatsSheet({ stats, mvpPlayerId, roundNumber }: { stats: PublicMatchPlayerStat[]; mvpPlayerId: string | null; roundNumber: number | null }) {
  const poster = mvpPoster(roundNumber)
  const sorted = [...stats].sort((a, b) => n(b.points) - n(a.points)
    || (n(b.rebounds) + n(b.assists)) - (n(a.rebounds) + n(a.assists)))

  // FG counts every field goal (2 and 3 pts), as stored in the database.
  const values = (stat: PublicMatchPlayerStat): BoxScoreValues => ({
    pts: n(stat.points),
    reb: n(stat.rebounds),
    ast: n(stat.assists),
    stl: n(stat.steals),
    blk: n(stat.blocks),
    pf: n(stat.personal_fouls),
    tov: n(stat.turnovers),
    oreb: n(stat.rebounds_offensive),
    dreb: n(stat.rebounds_defensive),
    fgM: n(stat.fg_made),
    fgA: n(stat.fg_attempted),
    ftM: n(stat.ft_made),
    ftA: n(stat.ft_attempted),
    threeM: n(stat.three_made),
    threeA: n(stat.three_attempted),
  })

  const rows: BoxScoreRow[] = sorted.map((stat) => ({
    id: stat.id,
    playerId: stat.player_id,
    name: fullName(stat),
    jersey: stat.player.jersey_number,
    isMvp: stat.player_id === mvpPlayerId,
    ...values(stat),
  }))

  const empty: BoxScoreValues = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, pf: 0, tov: 0, oreb: 0, dreb: 0, fgM: 0, fgA: 0, ftM: 0, ftA: 0, threeM: 0, threeA: 0 }
  const total = rows.reduce<BoxScoreValues>((sum, row) => {
    const next = { ...sum }
    for (const key of Object.keys(sum) as (keyof BoxScoreValues)[]) next[key] = sum[key] + row[key]
    return next
  }, empty)

  const mvp = sorted.find((stat) => stat.player_id === mvpPlayerId)
  const mvpLine = mvp ? [
    `${n(mvp.points)} pts`,
    n(mvp.rebounds) ? `${n(mvp.rebounds)} reb` : null,
    n(mvp.assists) ? `${n(mvp.assists)} passes` : null,
    n(mvp.fg_attempted) ? `${n(mvp.fg_made)}/${n(mvp.fg_attempted)} aux tirs` : null,
  ].filter(Boolean).join(' · ') : ''

  return (
    <>
      {mvp && <section aria-labelledby="match-mvp-title" className="grid gap-3">
        <h2 id="match-mvp-title" className="font-display text-3xl text-brand">MVP du match</h2>
        {poster ? <Link href={`/equipe/${mvp.player_id}`} aria-label={`MVP du match : ${fullName(mvp)}. Voir sa fiche`}
          className="mx-auto block w-full max-w-md overflow-hidden rounded-2xl border border-[var(--line)] shadow-[0_18px_40px_-22px_rgb(40_0_10/55%)] transition hover:border-[var(--gold-500)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- affiche déjà optimisée (WebP 540/864), srcSet manuel */}
          <img src={poster.src} srcSet={poster.srcSet} sizes="(min-width: 480px) 448px, 100vw" width={MVP_WIDTH} height={MVP_HEIGHT}
            alt={`MVP du match : ${fullName(mvp)} — ${mvpLine}`} className="block h-auto w-full" />
        </Link> : <Link href={`/equipe/${mvp.player_id}`} className="flex items-center gap-3 rounded-xl border border-[var(--gold-500)]/50 bg-[var(--gold-500)]/10 px-4 py-3 transition hover:border-[var(--gold-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
          <span className="shrink-0 rounded-md bg-gold px-2 pb-0.5 pt-1 font-display text-lg leading-none text-gold-foreground">MVP</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold text-[var(--ink)]">{fullName(mvp)}</span>
            <span className="block text-sm text-[var(--ink-soft)]">{mvpLine}</span>
          </span>
          <span aria-hidden="true" className="text-[var(--ink-soft)]">›</span>
        </Link>}
      </section>}

      <section aria-labelledby="match-performance-title" className="grid min-w-0 gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="match-performance-title" className="font-display text-3xl text-brand">Performance</h2>
          <span className="pb-1 text-xs font-semibold text-[var(--ink-soft)] sm:hidden">Glisse pour voir tout →</span>
        </div>
        <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
          <MatchBoxScore rows={rows} total={total} />
        </div>
      </section>
    </>
  )
}
