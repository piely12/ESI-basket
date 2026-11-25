import Link from 'next/link'

/*
 * Tableau « Performance » : toutes les stats d'un joueur sur une seule ligne.
 * Sur mobile le tableau défile horizontalement ; la colonne des noms reste
 * fixe à gauche (position sticky) pour toujours savoir de qui on parle.
 */

export type BoxScoreRow = {
  id: string
  playerId: string
  name: string
  jersey: number | null
  isMvp: boolean
  pf: number
  twoA: number
  twoM: number
  threeA: number
  threeM: number
  ftA: number
  ftM: number
  rd: number
  ro: number
  ast: number
  stl: number
  blk: number
  tov: number
  pts: number
}

export type BoxScoreTotal = Omit<BoxScoreRow, 'id' | 'playerId' | 'name' | 'jersey' | 'isMvp'>

// Les stats de la fiche de match, dans l'ordre de la fiche papier. Les tirs
// réunissent réussis et tentés en une colonne « 2/5 » avec une barre de réussite.
type Column =
  | { kind: 'count'; key: keyof BoxScoreTotal; top: string; bottom?: string; title: string }
  | { kind: 'ratio'; key: string; made: keyof BoxScoreTotal; attempted: keyof BoxScoreTotal; top: string; title: string }

const COLUMNS: Column[] = [
  { kind: 'count', key: 'pf', top: 'F', title: 'Fautes' },
  { kind: 'ratio', key: 'two', made: 'twoM', attempted: 'twoA', top: '2 pts', title: 'Tirs à 2 points réussis / tentés' },
  { kind: 'ratio', key: 'three', made: 'threeM', attempted: 'threeA', top: '3 pts', title: 'Tirs à 3 points réussis / tentés' },
  { kind: 'ratio', key: 'ft', made: 'ftM', attempted: 'ftA', top: 'LF', title: 'Lancers francs réussis / tentés' },
  { kind: 'count', key: 'rd', top: 'Reb', bottom: 'déf.', title: 'Rebonds défensifs' },
  { kind: 'count', key: 'ro', top: 'Reb', bottom: 'off.', title: 'Rebonds offensifs' },
  { kind: 'count', key: 'ast', top: 'PD', title: 'Passes décisives' },
  { kind: 'count', key: 'stl', top: 'INT', title: 'Interceptions' },
  { kind: 'count', key: 'blk', top: 'CTR', title: 'Contres' },
  { kind: 'count', key: 'tov', top: 'BP', title: 'Pertes de balle' },
  { kind: 'count', key: 'pts', top: 'PTS', title: 'Points' },
]

/** « 2/5 » avec, dessous, une barre qui montre la part de tirs réussis. */
function Ratio({ made, attempted }: { made: number; attempted: number }) {
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

function Cell({ column, values }: { column: Column; values: BoxScoreTotal }) {
  return column.kind === 'ratio'
    ? <Ratio made={values[column.made]} attempted={values[column.attempted]} />
    : <>{values[column.key]}</>
}

// Fond opaque pour la colonne figée, sinon les chiffres apparaîtraient dessous en défilant.
const STICKY = 'sticky left-0 z-10 bg-[var(--surface)] shadow-[1px_0_0_var(--line)]'

export default function MatchBoxScore({ rows, total }: { rows: BoxScoreRow[]; total: BoxScoreTotal }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Statistiques des joueurs, défilement horizontal" tabIndex={0}>
      <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm tabular-nums">
        <thead>
          <tr className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            <th scope="col" className={`${STICKY} py-2 pr-3 text-left`}>Joueur</th>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col" title={column.title} className="whitespace-nowrap px-2 py-2 text-right align-bottom leading-tight">{column.top}{column.kind === 'count' && column.bottom && <span className="block text-[9px] tracking-[0.06em]">{column.bottom}</span>}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={`${STICKY} w-40 max-w-40 border-t border-[var(--line)] py-2.5 pr-3 text-left font-bold`}>
                <Link href={`/equipe/${row.playerId}`} className="flex min-w-0 items-center gap-1.5 rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
                  <span className="w-5 shrink-0 text-xs font-semibold text-[var(--ink-soft)]">{row.jersey ?? '–'}</span>
                  <span className="min-w-0 break-words leading-tight">{row.name}</span>
                  {row.isMvp && <span className="shrink-0 rounded bg-gold px-1 py-0.5 text-[9px] font-extrabold leading-none text-gold-foreground">MVP</span>}
                </Link>
              </th>
              {COLUMNS.map((column) => (
                <td key={column.key} className={`whitespace-nowrap border-t border-[var(--line)] px-2 py-2.5 text-right font-semibold ${column.key === 'pts' ? 'font-extrabold text-brand' : ''}`}><Cell column={column} values={row} /></td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-extrabold">
            <th scope="row" className={`${STICKY} border-t-2 border-[var(--ink)] py-2.5 pr-3 text-left`}>Équipe</th>
            {COLUMNS.map((column) => (
              <td key={column.key} className="whitespace-nowrap border-t-2 border-[var(--ink)] px-2 py-2.5 text-right"><Cell column={column} values={total} /></td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
