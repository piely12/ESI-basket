'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Player } from '@/lib/data/public'
import { playerCardInfo } from '@/lib/data/player-card'
import PlayerCardVisual from '@/components/PlayerCardVisual'

const positions = ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot']

export default function RosterGrid({ players }: { players: Player[] }) {
  const [position, setPosition] = useState<string | null>(null)
  const filtered = useMemo(() => players.filter((player) => !position || playerCardInfo(player).position?.split(' / ').includes(position)), [players, position])

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par poste">
        {[null, ...positions].map((item) => <button key={item ?? 'tous'} type="button" aria-pressed={position === item} onClick={() => setPosition(item)} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${position === item ? 'bg-[var(--maroon-900)] text-white' : 'bg-[var(--line)]/50 text-[var(--ink)] hover:bg-[var(--line)]'}`}>{item ?? 'Tous'}</button>)}
      </div>
      {filtered.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((player) => <Link key={player.id} href={`/equipe/${player.id}`} className="transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]"><PlayerCardVisual player={player} variant="compact" /></Link>)}
      </div> : <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--ink-soft)]">Aucun joueur pour ce poste.</div>}
    </>
  )
}
