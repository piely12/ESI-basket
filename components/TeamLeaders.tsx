'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { formatAverage, percentOf } from '@/lib/stats/player-stats'
import { LEADER_STATS, MIN_ATTEMPTS, rankLeaders, type LeaderPlayer, type LeaderStatKey } from '@/lib/stats/team-leaders'

/*
 * Leaders de l'équipe : top 3 d'une statistique. Le bouton « Points ▾ » ouvre la liste des
 * statistiques (jeu, puis tirs). Pour les tirs, on classe par nombre de réussis ou par pourcentage.
 */

const initials = (name: string) => name.split(/\s+/).map((word) => word[0] ?? '').slice(0, 2).join('').toUpperCase()

export default function TeamLeaders({ players }: { players: LeaderPlayer[] }) {
  const [stat, setStat] = useState<LeaderStatKey>('points')
  const [mode, setMode] = useState<'made' | 'pct'>('made')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const onPointer = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const def = LEADER_STATS.find((item) => item.key === stat) ?? LEADER_STATS[0]
  const shooting = def.kind === 'shooting'
  const rows = rankLeaders(players, stat, mode)
  const title = `${def.title} · ${shooting ? (mode === 'made' ? 'nombre de réussis' : 'pourcentage de réussite') : 'moyenne par match'}`

  const choose = (key: LeaderStatKey) => { setStat(key); setOpen(false) }
  const group = (kind: 'average' | 'shooting', heading: string) => (
    <div className="grid gap-1.5">
      <p className="px-1 pt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{heading}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {LEADER_STATS.filter((item) => item.kind === kind).map((item) => (
          <button key={item.key} type="button" aria-pressed={item.key === stat} onClick={() => choose(item.key)}
            className={`flex min-h-11 items-center justify-between gap-1.5 rounded-lg px-3 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)] ${item.key === stat ? 'bg-maroon-panel text-on-brand' : 'text-[var(--ink)] hover:bg-[var(--neutral-bg)]'}`}>
            {item.label}{item.key === stat && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div ref={root} className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-[var(--ink-soft)]">{title}</p>
        <button type="button" aria-expanded={open} aria-label={`Filtrer les leaders, statistique actuelle : ${def.label}`} onClick={() => setOpen((value) => !value)}
          className={`inline-flex min-h-11 flex-none items-center gap-3 rounded-full border bg-[var(--surface)] px-5 text-base font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)] ${open ? 'border-primary text-brand' : 'border-[var(--line)] text-[var(--ink)]'}`}>
          {def.label}
          <svg viewBox="0 0 10 6" aria-hidden="true" className={`h-1.5 w-2.5 fill-current transition ${open ? 'rotate-180' : ''}`}><path d="M0 0h10L5 6z" /></svg>
        </button>
      </div>

      {open && (
        <div role="group" aria-label="Choisir la statistique" className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-xl">
          {group('average', 'Jeu')}
          {group('shooting', 'Tirs')}
        </div>
      )}

      {shooting && (
        <div role="group" aria-label="Classer par" className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--neutral-bg)] p-1">
          {([['made', 'Réussis'], ['pct', 'Pourcentage']] as const).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}
              className={`min-h-11 rounded-xl text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)] ${mode === key ? 'bg-[var(--surface)] text-brand shadow-sm' : 'text-[var(--ink-soft)]'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {rows.length ? (
        <ol className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5">
          {rows.map((row, index) => {
            const first = index === 0
            const share = row.made !== undefined && row.attempted !== undefined ? percentOf(row.made, row.attempted) : null
            const big = !shooting ? formatAverage(row.value) : mode === 'made' ? `${row.made}/${row.attempted}` : `${Math.round(row.value)} %`
            const small = !shooting ? 'par match' : mode === 'made' ? `${share ?? 0} % de réussite` : `${row.made}/${row.attempted} réussis`
            return (
              <li key={row.player.id} className="border-t border-[var(--line)] first:border-t-0">
                <Link href={`/equipe/${row.player.id}`} className="flex items-center gap-3 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
                  <span className={`w-7 flex-none text-center font-display text-4xl leading-none tabular-nums ${first ? 'text-[var(--gold-deep)]' : 'text-[var(--ink-soft)]'}`}>{index + 1}</span>
                  <span className={`grid size-12 flex-none place-items-center rounded-full bg-maroon-panel font-display text-xl text-[var(--gold-500)] ${first ? 'ring-[3px] ring-[var(--gold-500)]' : ''}`} aria-hidden="true">{initials(row.player.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{row.player.name}</span>
                    <span className="block truncate text-sm text-[var(--ink-soft)]">{row.player.position}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-4xl leading-[0.95] text-brand tabular-nums">{big}</span>
                    <span className="block text-xs font-bold text-[var(--ink-soft)]">{small}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-soft)]">
          {shooting && mode === 'pct' ? `Aucun joueur n’a encore ${MIN_ATTEMPTS} tentatives dans cette statistique.` : 'Les statistiques apparaîtront dès la publication des premières feuilles de match.'}
        </p>
      )}
      <p className="text-xs text-[var(--ink-soft)]">{shooting && mode === 'pct' ? `Au moins ${MIN_ATTEMPTS} tentatives pour apparaître dans ce classement.` : 'Top 3 de l’équipe sur la saison.'}</p>
    </div>
  )
}
