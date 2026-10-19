'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import type { Player } from '@/lib/data/public'
import { playerCardInfo } from '@/lib/data/player-card'
import PlayerCardVisual from '@/components/PlayerCardVisual'
import EmptyState from '@/components/ui/EmptyState'

const positions = ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot']

export default function RosterGrid({ players }: { players: Player[] }) {
  const [position, setPosition] = useState<string | null>(null)
  const filterMenu = useRef<HTMLDetailsElement>(null)
  const filtered = useMemo(() => players.filter((player) => !position || playerCardInfo(player).position?.split(' / ').includes(position)), [players, position])

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-start gap-2">
        <button type="button" aria-pressed={position === null} onClick={() => setPosition(null)} className={`min-h-11 rounded-full px-5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] ${position === null ? 'bg-[var(--maroon-900)] text-white' : 'bg-[var(--line)]/50 text-[var(--ink)] hover:bg-[var(--line)]'}`}>
          Tous
        </button>
        <details ref={filterMenu} className="relative">
          <summary aria-label={position ? `Filtrer par poste, filtre actif : ${position}` : 'Filtrer par poste'} className="flex size-11 list-none cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--maroon-900)] shadow-sm transition hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] [&::-webkit-details-marker]:hidden">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16l-6.2 7.1v5.4l-3.6 1.9v-7.3L4 5Z" />
            </svg>
            {position && <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--gold-deep)]" />}
          </summary>
          <div className="fixed inset-x-3 bottom-[calc(65px+env(safe-area-inset-bottom)+1rem)] z-40 max-h-[55vh] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:bottom-auto sm:z-20 sm:mt-2 sm:max-h-none sm:w-56 sm:rounded-xl sm:p-2 sm:shadow-xl" role="group" aria-label="Choisir un poste">
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Filtrer par poste</p>
            <div className="grid grid-cols-2 gap-1 sm:block">
            <button type="button" aria-label="Annuler le filtre et afficher tout l'effectif" onClick={() => { setPosition(null); if (filterMenu.current) filterMenu.current.open = false }} className="col-span-2 flex min-h-11 w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-left text-sm font-bold text-[var(--maroon-900)] hover:bg-[var(--line)] sm:col-span-1">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6M9 12h12" /></svg>
              Tout l&apos;effectif
            </button>
            {positions.map((item) => <button key={item} type="button" aria-pressed={position === item} onClick={() => { setPosition(item); if (filterMenu.current) filterMenu.current.open = false }} className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold transition ${position === item ? 'bg-[var(--maroon-900)] text-white' : 'text-[var(--ink)] hover:bg-[var(--paper)]'}`}>
              {item}{position === item && <span aria-hidden="true">✓</span>}
            </button>)}
            </div>
          </div>
        </details>
      </div>
      {filtered.length ? <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {filtered.map((player) => <Link key={player.id} href={`/equipe/${player.id}`} className="transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]"><PlayerCardVisual player={player} variant="compact" /></Link>)}
      </div> : <EmptyState title={players.length ? 'Aucun joueur pour ce poste' : 'Aucun joueur dans l’effectif'} description={players.length ? 'Choisis un autre poste ou affiche tout l’effectif.' : 'Les fiches des joueurs apparaîtront ici dès leur ajout.'} actionLabel={players.length && position ? 'Afficher tout l’effectif' : undefined} onAction={players.length && position ? () => setPosition(null) : undefined} />}
    </>
  )
}
