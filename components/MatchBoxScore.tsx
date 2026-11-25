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

// Les 14 stats de la fiche de match, dans l'ordre de la fiche papier.
const COLUMNS: { key: keyof BoxScoreTotal; top: string; bottom?: string; title: string }[] = [
  { key: 'pf', top: 'F', title: 'Fautes' },
  { key: 'twoA', top: '2 pts', bottom: 'tentés', title: 'Tirs à 2 points tentés' },
  { key: 'twoM', top: '2 pts', bottom: 'réussis', title: 'Tirs à 2 points réussis' },
  { key: 'threeA', top: '3 pts', bottom: 'tentés', title: 'Tirs à 3 points tentés' },
  { key: 'threeM', top: '3 pts', bottom: 'réussis', title: 'Tirs à 3 points réussis' },
  { key: 'ftA', top: 'LF', bottom: 'tentés', title: 'Lancers francs tentés' },
  { key: 'ftM', top: 'LF', bottom: 'réussis', title: 'Lancers francs réussis' },
  { key: 'rd', top: 'Reb', bottom: 'déf.', title: 'Rebonds défensifs' },
  { key: 'ro', top: 'Reb', bottom: 'off.', title: 'Rebonds offensifs' },
  { key: 'ast', top: 'PD', title: 'Passes décisives' },
  { key: 'stl', top: 'INT', title: 'Interceptions' },
  { key: 'blk', top: 'CTR', title: 'Contres' },
  { key: 'tov', top: 'BP', title: 'Pertes de balle' },
  { key: 'pts', top: 'PTS', title: 'Points' },
]

// Fond opaque pour la colonne figée, sinon les chiffres apparaîtraient dessous en défilant.
const STICKY = 'sticky left-0 z-10 bg-[var(--surface)] shadow-[1px_0_0_var(--line)]'

export default function MatchBoxScore({ rows, total }: { rows: BoxScoreRow[]; total: BoxScoreTotal }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Statistiques des joueurs, défilement horizontal" tabIndex={0}>
      <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm tabular-nums">
        <thead>
          <tr className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            <th scope="col" className={`${STICKY} py-2 pr-3 text-left`}>Joueur</th>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col" title={column.title} className="whitespace-nowrap px-2 py-2 text-right align-bottom leading-tight">{column.top}{column.bottom && <span className="block text-[9px] tracking-[0.06em]">{column.bottom}</span>}</th>
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
                <td key={column.key} className={`whitespace-nowrap border-t border-[var(--line)] px-2 py-2.5 text-right font-semibold ${column.key === 'pts' ? 'font-extrabold text-brand' : ''}`}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-extrabold">
            <th scope="row" className={`${STICKY} border-t-2 border-[var(--ink)] py-2.5 pr-3 text-left`}>Équipe</th>
            {COLUMNS.map((column) => (
              <td key={column.key} className="whitespace-nowrap border-t-2 border-[var(--ink)] px-2 py-2.5 text-right">{total[column.key]}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
