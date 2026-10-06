'use client'

import { useMemo, useState } from 'react'
import type { MatchRow } from '@/lib/data/public'
import MatchCard from '@/components/MatchCard'

type Filter = 'tous' | 'termines' | 'avenir'

export default function MatchList({ matches }: { matches: MatchRow[] }) {
  const [filter, setFilter] = useState<Filter>('tous')
  const rows = useMemo(() => matches
    .filter((match) => filter === 'tous' || (filter === 'termines' ? match.status === 'termine' : match.status !== 'termine'))
    .sort((a, b) => Number(b.home_team.is_esi || b.away_team.is_esi) - Number(a.home_team.is_esi || a.away_team.is_esi) || a.scheduled_at.localeCompare(b.scheduled_at)), [matches, filter])

  const filters: { id: Filter; label: string }[] = [
    { id: 'tous', label: 'Tous' }, { id: 'termines', label: 'Terminés' }, { id: 'avenir', label: 'À venir' },
  ]

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer les matchs">
        {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${filter === item.id ? 'bg-[var(--maroon-900)] text-white' : 'bg-[var(--line)]/50 text-[var(--ink)] hover:bg-[var(--line)]'}`}>{item.label}</button>)}
      </div>
      {rows.length ? <div className="grid gap-3 md:grid-cols-2">{rows.map((match) => <MatchCard key={match.id} match={match} />)}</div> : <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--ink-soft)]">Aucun match dans cette catégorie pour le moment.</div>}
    </>
  )
}
