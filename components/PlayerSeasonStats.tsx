'use client'

import { useState } from 'react'

/*
 * Saison d'un joueur : points, rebonds et passes en grand ; interceptions,
 * contres, balles perdues et fautes en petit ; adresse en barres.
 * Le bouton Moyennes / Totaux change l'affichage sans recharger la page.
 */

export type SeasonTotals = {
  played: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number
  twoMade: number
  twoAttempted: number
  threeMade: number
  threeAttempted: number
  ftMade: number
  ftAttempted: number
}

type Mode = 'avg' | 'tot'

function ShootingBar({ label, made, attempted }: { label: string; made: number; attempted: number }) {
  const share = attempted ? Math.round((made / attempted) * 100) : 0
  return (
    <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-sm font-bold tabular-nums">
      <span className="text-[var(--ink)]">{label}</span>
      <span className="block h-2.5 overflow-hidden rounded-full bg-[var(--neutral-bg)]" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
      </span>
      <span className="text-right text-[var(--ink-soft)]">{attempted ? `${made}/${attempted} · ${share} %` : 'aucun tir'}</span>
    </div>
  )
}

export default function PlayerSeasonStats({ totals }: { totals: SeasonTotals }) {
  const [mode, setMode] = useState<Mode>('avg')
  const value = (total: number) => (mode === 'tot' ? String(total) : totals.played ? (total / totals.played).toFixed(1) : '0.0')
  const matches = `${totals.played} match${totals.played > 1 ? 's' : ''} joué${totals.played > 1 ? 's' : ''}`

  const main = [
    { label: 'Points', total: totals.points },
    { label: 'Rebonds', total: totals.rebounds },
    { label: 'Passes', total: totals.assists },
  ]
  const minor = [
    { label: 'Int.', title: 'Interceptions', total: totals.steals },
    { label: 'Contres', title: 'Contres', total: totals.blocks },
    { label: 'B. perdues', title: 'Balles perdues', total: totals.turnovers },
    { label: 'Fautes', title: 'Fautes', total: totals.fouls },
  ]

  return (
    <div className="grid gap-3">
      <section aria-labelledby="season-stats-title" className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="season-stats-title" className="font-display text-3xl leading-none text-brand">Saison</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-deep)]">{mode === 'avg' ? 'Par match' : 'Total'} · {matches}</p>
          </div>
          <div role="group" aria-label="Affichage des statistiques" className="inline-flex rounded-full bg-[var(--neutral-bg)] p-1">
            {([['avg', 'Moyennes'], ['tot', 'Totaux']] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}
                className={`min-h-9 rounded-full px-3.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)] ${mode === key ? 'bg-[var(--surface)] text-brand shadow-sm' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[var(--line)] text-center">
          {main.map((stat) => (
            <div key={stat.label} className="grid gap-1 px-1">
              <span className="font-display text-5xl leading-none text-brand tabular-nums">{value(stat.total)}</span>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {minor.map((stat) => (
            <div key={stat.label} title={stat.title} className="grid gap-0.5 rounded-lg bg-[var(--neutral-bg)] px-1 py-2 text-center">
              <span className="text-lg font-extrabold leading-none text-[var(--ink)] tabular-nums">{value(stat.total)}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-soft)]">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="shooting-title" className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 id="shooting-title" className="font-display text-3xl leading-none text-brand">Adresse</h2>
        <ShootingBar label="2 pts" made={totals.twoMade} attempted={totals.twoAttempted} />
        <ShootingBar label="3 pts" made={totals.threeMade} attempted={totals.threeAttempted} />
        <ShootingBar label="LF" made={totals.ftMade} attempted={totals.ftAttempted} />
      </section>
    </div>
  )
}
