import Link from 'next/link'
import StatLegend from '@/components/StatLegend'

/*
 * Tableau « Performance » : toutes les stats d'un joueur sur une seule ligne.
 * Sur mobile le tableau défile horizontalement ; la colonne des noms reste
 * fixe à gauche (position sticky) pour toujours savoir de qui on parle.
 * Les abréviations sont expliquées par le bouton « Légende » sous le tableau.
 */

export type BoxScoreValues = {
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  pf: number
  tov: number
  oreb: number
  dreb: number
  fgM: number
  fgA: number
  ftM: number
  ftA: number
  threeM: number
  threeA: number
}

export type BoxScoreRow = BoxScoreValues & {
  id: string
  playerId: string
  name: string
  jersey: number | null
  isMvp: boolean
}

const pct = (made: number, attempted: number) => (attempted ? `${Math.round((made / attempted) * 100)} %` : '—')

// Ordre des colonnes demandé par le club.
const COLUMNS: { key: string; label: string; title: string; value: (v: BoxScoreValues) => string | number }[] = [
  { key: 'pts', label: 'PTS', title: 'Points', value: (v) => v.pts },
  { key: 'reb', label: 'REB', title: 'Rebonds', value: (v) => v.reb },
  { key: 'ast', label: 'AST', title: 'Passes décisives', value: (v) => v.ast },
  { key: 'stl', label: 'STL', title: 'Interceptions', value: (v) => v.stl },
  { key: 'blk', label: 'BLK', title: 'Contres', value: (v) => v.blk },
  { key: 'pf', label: 'PF', title: 'Fautes personnelles', value: (v) => v.pf },
  { key: 'tov', label: 'TOV', title: 'Balles perdues', value: (v) => v.tov },
  { key: 'oreb', label: 'OREB', title: 'Rebonds offensifs', value: (v) => v.oreb },
  { key: 'dreb', label: 'DREB', title: 'Rebonds défensifs', value: (v) => v.dreb },
  { key: 'fg', label: 'FG', title: 'Paniers', value: (v) => `${v.fgM}/${v.fgA}` },
  { key: 'fgp', label: 'FG%', title: 'Pourcentage de tirs réussis', value: (v) => pct(v.fgM, v.fgA) },
  { key: 'ft', label: 'FT', title: 'Lancers francs', value: (v) => `${v.ftM}/${v.ftA}` },
  { key: 'ftp', label: 'FT%', title: 'Pourcentage aux lancers francs', value: (v) => pct(v.ftM, v.ftA) },
  { key: '3p', label: '3P', title: '3 points', value: (v) => `${v.threeM}/${v.threeA}` },
  { key: '3pp', label: '3P%', title: 'Pourcentage à 3 points', value: (v) => pct(v.threeM, v.threeA) },
]

export const PERFORMANCE_LEGEND = COLUMNS.map((column) => [column.label, column.title] as const)

// Fond opaque pour la colonne figée, sinon les chiffres apparaîtraient dessous en défilant.
const STICKY = 'sticky left-0 z-10 bg-[var(--surface)] shadow-[1px_0_0_var(--line)]'

export default function MatchBoxScore({ rows, total }: { rows: BoxScoreRow[]; total: BoxScoreValues }) {
  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Statistiques des joueurs, défilement horizontal" tabIndex={0}>
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm tabular-nums">
          <thead>
            <tr className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              <th scope="col" className={`${STICKY} py-2 pr-3 text-left`}>Joueur</th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" title={column.title} className="whitespace-nowrap px-2 py-2 text-right">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className={`${STICKY} w-40 max-w-40 border-t border-[var(--line)] py-2.5 pr-3 text-left font-bold`}>
                  <Link href={`/equipe/${row.playerId}`} className="flex min-w-0 items-center gap-1.5 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
                    <span className="w-5 shrink-0 text-xs font-semibold text-[var(--ink-soft)]">{row.jersey ?? '–'}</span>
                    <span className="min-w-0 break-words leading-tight underline decoration-[1.5px] underline-offset-4">{row.name}</span>
                    {row.isMvp && <span className="shrink-0 rounded bg-gold px-1 py-0.5 text-[9px] font-extrabold leading-none text-gold-foreground">MVP</span>}
                  </Link>
                </th>
                {COLUMNS.map((column) => (
                  <td key={column.key} className={`whitespace-nowrap border-t border-[var(--line)] px-2 py-2.5 text-right font-semibold ${column.key === 'pts' ? 'font-extrabold text-brand' : ''}`}>{column.value(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-extrabold">
              <th scope="row" className={`${STICKY} border-t-2 border-[var(--ink)] py-2.5 pr-3 text-left`}>Équipe</th>
              {COLUMNS.map((column) => (
                <td key={column.key} className="whitespace-nowrap border-t-2 border-[var(--ink)] px-2 py-2.5 text-right">{column.value(total)}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <StatLegend title="Légende des performances" items={PERFORMANCE_LEGEND} />
    </div>
  )
}

/** « 2/5 » avec, dessous, une barre de réussite (utilisé sur la fiche joueur). */
export function ShotRatio({ made, attempted }: { made: number; attempted: number }) {
  const share = attempted > 0 ? Math.round((made / attempted) * 100) : 0
  return (
    <span className={`ml-auto grid w-12 gap-1 ${attempted ? '' : 'text-[var(--ink-soft)]'}`} title={attempted ? `${share} % de réussite` : 'Aucun tir tenté'}>
      <span>{made}/{attempted}</span>
      <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--neutral-bg)]" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
      </span>
    </span>
  )
}
