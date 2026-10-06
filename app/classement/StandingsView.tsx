'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { StandingRow } from '@/lib/data/public'
import TeamLogo from '@/components/TeamLogo'

export default function StandingsView({ rows }: { rows: StandingRow[] }) {
  const [selectedId, setSelectedId] = useState(rows.find((row) => row.team.is_esi)?.team_id ?? rows[0]?.team_id ?? null)
  const selected = rows.find((row) => row.team_id === selectedId) ?? null
  const headers = ['#', 'École', 'J', 'V', 'D', 'PP', 'PC', 'Diff', 'Pts']

  return (
    <>
      <section className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead className="bg-[var(--line)]/35 text-xs uppercase text-[var(--ink-soft)]"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 text-left">{header}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => {
              const isSelected = row.team_id === selectedId
              const difference = row.points_for - row.points_against
              return (
                <tr key={row.team_id} aria-selected={isSelected} tabIndex={0} onClick={() => setSelectedId(row.team_id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(row.team_id) } }} className={`cursor-pointer border-t border-[var(--line)] transition-colors ${isSelected && row.team.is_esi ? 'bg-[var(--maroon-900)] text-white' : isSelected ? 'bg-[var(--gold-500)]/20' : 'hover:bg-[var(--line)]/30'}`}>
                  <td className="px-3 py-2 font-display text-xl">{index + 1}</td>
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><TeamLogo team={row.team} size={32} className="h-8 w-8" /><span className="font-semibold">{row.team.name}</span></div></td>
                  <td className="px-3 py-2 tabular-nums">{row.played}</td><td className="px-3 py-2 tabular-nums">{row.won}</td><td className="px-3 py-2 tabular-nums">{row.lost}</td>
                  <td className="px-3 py-2 tabular-nums">{row.points_for}</td><td className="px-3 py-2 tabular-nums">{row.points_against}</td>
                  <td className="px-3 py-2 tabular-nums">{difference > 0 ? '+' : ''}{difference}</td><td className="px-3 py-2 font-display text-xl tabular-nums">{row.ranking_points}</td>
                </tr>
              )
            })}
            {!rows.length && <tr><td colSpan={9} className="px-3 py-7 text-center text-[var(--ink-soft)]">Le classement sera affiché dès que les résultats seront disponibles.</td></tr>}
          </tbody>
        </table>
      </section>
      {selected && <section className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <TeamLogo team={selected.team} size={56} className="h-14 w-14" />
          <div className="min-w-0"><h2 className="font-display text-3xl leading-none text-[var(--maroon-900)]">{selected.team.name}</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">{selected.team.city || 'Inter-Écoles INP-HB'}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Victoires · défaites', `${selected.won}–${selected.lost}`],
            ['Points marqués / match', (selected.points_for / Math.max(selected.played, 1)).toFixed(1)],
            ['Points encaissés / match', (selected.points_against / Math.max(selected.played, 1)).toFixed(1)],
            ['Différence', `${selected.points_for - selected.points_against > 0 ? '+' : ''}${selected.points_for - selected.points_against}`],
          ].map(([label, value]) => <div key={label} className="rounded bg-[var(--line)]/25 p-3"><div className="font-display text-2xl text-[var(--maroon-900)]">{value}</div><div className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">{label}</div></div>)}
        </div>
        {selected.team.is_esi && <Link href="/equipe" className="mt-4 inline-block text-sm font-semibold text-[var(--maroon-700)]">Voir l’effectif ESI →</Link>}
      </section>}
    </>
  )
}
