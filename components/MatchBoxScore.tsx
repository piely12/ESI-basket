'use client'

import Link from 'next/link'
import { useState } from 'react'

export type BoxScoreRow = {
  id: string
  playerId: string
  name: string
  jersey: number | null
  isMvp: boolean
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  pf: number
  fg: string
  three: string
  ft: string
}

export type BoxScoreTotal = Omit<BoxScoreRow, 'id' | 'playerId' | 'name' | 'jersey' | 'isMvp'>

type View = 'ess' | 'tir' | 'def'
type Column = { key: keyof BoxScoreTotal; label: string; title: string }

const VIEWS: Record<View, { label: string; columns: Column[] }> = {
  ess: { label: 'Essentiel', columns: [
    { key: 'pts', label: 'PTS', title: 'Points' },
    { key: 'reb', label: 'REB', title: 'Rebonds' },
    { key: 'ast', label: 'AST', title: 'Passes décisives' },
  ] },
  tir: { label: 'Tirs', columns: [
    { key: 'fg', label: 'Tirs', title: 'Tirs réussis / tentés' },
    { key: 'three', label: '3 pts', title: 'Tirs à 3 points réussis / tentés' },
    { key: 'ft', label: 'LF', title: 'Lancers francs réussis / tentés' },
  ] },
  def: { label: 'Défense', columns: [
    { key: 'stl', label: 'INT', title: 'Interceptions' },
    { key: 'blk', label: 'CTR', title: 'Contres' },
    { key: 'tov', label: 'BP', title: 'Balles perdues' },
    { key: 'pf', label: 'F', title: 'Fautes' },
  ] },
}

export default function MatchBoxScore({ rows, total }: { rows: BoxScoreRow[]; total: BoxScoreTotal }) {
  const [view, setView] = useState<View>('ess')
  const { columns } = VIEWS[view]

  return (
    <div className="grid gap-3">
      <div role="tablist" aria-label="Catégorie de statistiques" className="flex gap-1 rounded-full bg-[var(--neutral-bg)] p-1">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <button key={key} type="button" role="tab" id={`box-tab-${key}`} aria-selected={view === key} aria-controls="box-score-table"
            onClick={() => setView(key)}
            className={`min-h-9 flex-1 rounded-full px-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)] ${view === key ? 'bg-maroon-panel text-on-brand shadow-sm' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}>
            {VIEWS[key].label}
          </button>
        ))}
      </div>

      <table id="box-score-table" role="tabpanel" aria-labelledby={`box-tab-${view}`} className="w-full table-fixed text-sm tabular-nums">
        <colgroup>
          <col />
          {columns.map((column) => <col key={column.key} className={view === 'tir' ? 'w-[3.6rem]' : 'w-11'} />)}
          <col className="w-5" />
        </colgroup>
        <thead>
          <tr className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            <th scope="col" className="py-2 text-left">Joueur</th>
            {columns.map((column) => <th key={column.key} scope="col" title={column.title} className="py-2 text-right">{column.label}</th>)}
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--line)]">
              <th scope="row" className="py-2.5 pr-2 text-left font-bold">
                <Link href={`/equipe/${row.playerId}`} className="flex min-w-0 items-center gap-1.5 rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
                  <span className="w-6 shrink-0 text-xs font-semibold text-[var(--ink-soft)]">{row.jersey ?? '–'}</span>
                  <span className="min-w-0 break-words leading-tight">{row.name}</span>
                  {row.isMvp && <span className="shrink-0 rounded bg-gold px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-gold-foreground">MVP</span>}
                </Link>
              </th>
              {columns.map((column, index) => (
                <td key={column.key} className={`py-2.5 text-right font-semibold ${view === 'ess' && index === 0 ? 'font-extrabold text-brand' : ''}`}>{row[column.key]}</td>
              ))}
              <td aria-hidden="true" className="py-2.5 text-right text-[var(--ink-soft)]">›</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[var(--ink)] font-extrabold">
            <th scope="row" className="py-2.5 text-left">Équipe</th>
            {columns.map((column) => <td key={column.key} className="py-2.5 text-right">{total[column.key]}</td>)}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
