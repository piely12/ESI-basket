'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { SeasonJourney } from '@/lib/data/public'
import { formatAverage, percentOf, sumLines, type StatLine } from '@/lib/stats/player-stats'

/*
 * Statistiques d'un joueur : moyennes de la saison, ou une journée précise.
 * Le sélecteur « Période » change l'affichage sans recharger la page.
 * Aucune abréviation : les libellés sont écrits en toutes lettres.
 */

type Props = {
  entries: { matchId: string; line: StatLine }[]
  journeys: SeasonJourney[]
  mvpMatchIds: string[]
}

const sectionTitle = 'font-display text-3xl leading-none text-brand'
const card = 'rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5'

function Kpis({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map((item, index) => (
        <div key={item.label}
          className={`rounded-xl border border-t-[3px] border-[var(--line)] border-t-[var(--gold-500)] px-2 pb-2.5 pt-3 text-center ${index === 0 ? 'bg-maroon-panel' : 'bg-[var(--surface)]'}`}>
          <span className={`block font-display text-5xl leading-[0.95] tabular-nums ${index === 0 ? 'text-[var(--gold-500)]' : 'text-brand'}`}>{item.value}</span>
          <span className={`mt-1 block text-xs font-extrabold uppercase tracking-[0.1em] ${index === 0 ? 'text-on-brand opacity-80' : 'text-[var(--ink-soft)]'}`}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function ShootingRows({ rows }: { rows: { label: string; made: number; attempted: number }[] }) {
  return (
    <div className={card}>
      {rows.map((row) => {
        const share = percentOf(row.made, row.attempted)
        return (
          <div key={row.label} className="grid gap-1.5 border-t border-[var(--line)] py-3 first:border-t-0 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">{row.label}</span>
              <span className="flex items-center gap-2.5">
                <span className="font-display text-3xl leading-none text-brand tabular-nums">{row.made}/{row.attempted}</span>
                <span className="min-w-14 rounded-full bg-[var(--neutral-bg)] px-2 py-0.5 text-center text-sm font-bold tabular-nums">{share === null ? '—' : `${share} %`}</span>
              </span>
            </div>
            <span className="block h-2 overflow-hidden rounded-full bg-[var(--neutral-bg)]" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${share ?? 0}%` }} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StatList({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className={card}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 border-t border-[var(--line)] py-3 first:border-t-0 first:pt-0 last:pb-0">
          <span className="font-bold">{row.label}</span>
          <span className="font-display text-3xl leading-none text-brand tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

function ScorePoster({ journey, title }: { journey: SeasonJourney; title: string }) {
  const hasScore = journey.esiScore !== null && journey.opponentScore !== null
  const won = hasScore && journey.esiScore! > journey.opponentScore!
  return (
    <div className="grid gap-4 rounded-2xl bg-maroon-panel p-5 text-center text-on-brand">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] opacity-80">{title} · Terminé</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="grid justify-items-center gap-2">
          <span className="grid size-16 place-items-center rounded-full bg-gold font-display text-2xl text-gold-foreground">ESI</span>
          <span className="text-[13px] font-bold tracking-[0.06em]">THE LIONS</span>
        </span>
        <span className="font-display text-6xl leading-[0.9] tabular-nums">
          {hasScore ? <>{journey.esiScore}<span className="px-1.5 text-[var(--gold-500)]">–</span>{journey.opponentScore}</> : '—'}
        </span>
        <span className="grid justify-items-center gap-2">
          <span className="grid size-16 place-items-center rounded-full bg-white/15 px-1 font-display text-xl leading-none">{journey.opponent.slice(0, 5).toUpperCase()}</span>
          <span className="max-w-full truncate text-[13px] font-bold tracking-[0.06em]">{journey.opponent.toUpperCase()}</span>
        </span>
      </div>
      {hasScore && <span><span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] ${won ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'}`}>{won ? 'Victoire' : 'Défaite'}</span></span>}
    </div>
  )
}

const matchLink = 'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-maroon-panel px-4 font-bold text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]'

export default function PlayerStatsExplorer({ entries, journeys, mvpMatchIds }: Props) {
  const [selected, setSelected] = useState<string>('avg')
  const lineByMatch = new Map(entries.map((entry) => [entry.matchId, entry.line]))
  const played = entries.length
  const total = sumLines(entries.map((entry) => entry.line))
  const perGame = (value: number) => formatAverage(played ? value / played : 0)

  const journeyIndex = journeys.findIndex((journey) => journey.matchId === selected)
  const journey = journeyIndex >= 0 ? journeys[journeyIndex] : null
  const line = journey ? lineByMatch.get(journey.matchId) ?? null : null
  const roundLabel = (item: SeasonJourney, index: number) => (item.round ? item.round : index + 1)

  if (!played && !journeys.length) {
    return <p className={`${card} text-sm text-[var(--ink-soft)]`}>Aucun match joué cette saison pour le moment.</p>
  }

  const shooting = (source: StatLine) => [
    { label: 'Paniers', made: source.fgMade, attempted: source.fgAttempted },
    { label: '2 points', made: source.twoMade, attempted: source.twoAttempted },
    { label: '3 points', made: source.threeMade, attempted: source.threeAttempted },
    { label: 'Lancers francs', made: source.ftMade, attempted: source.ftAttempted },
  ]
  const others = (source: StatLine, format: (value: number) => string) => [
    { label: 'Interceptions', value: format(source.steals) },
    { label: 'Contres', value: format(source.blocks) },
    { label: 'Fautes personnelles', value: format(source.fouls) },
    { label: 'Balles perdues', value: format(source.turnovers) },
    { label: 'Rebonds offensifs', value: format(source.offensiveRebounds) },
    { label: 'Rebonds défensifs', value: format(source.defensiveRebounds) },
  ]
  const kpis = (source: StatLine, format: (value: number) => string) => [
    { label: 'Points', value: format(source.points) },
    { label: 'Rebonds', value: format(source.rebounds) },
    { label: 'Passes décisives', value: format(source.assists) },
  ]

  const chips: { key: string; label: string; sub: string; result: 'win' | 'loss' | 'none' }[] = [
    { key: 'avg', label: 'Moyennes', sub: 'Saison', result: 'none' },
    ...journeys.map((item, index) => {
      const hasScore = item.esiScore !== null && item.opponentScore !== null
      return {
        key: item.matchId, label: `J${roundLabel(item, index)}`, sub: item.opponent,
        result: !hasScore || !lineByMatch.has(item.matchId) ? ('none' as const) : item.esiScore! > item.opponentScore! ? ('win' as const) : ('loss' as const),
      }
    }),
  ]
  const hasScore = journey && journey.esiScore !== null && journey.opponentScore !== null
  const won = hasScore && journey.esiScore! > journey.opponentScore!
  const title = journey ? `Journée ${roundLabel(journey, journeyIndex)}` : ''

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Période</span>
          <span className="truncate text-sm text-[var(--ink-soft)]">{journey ? `${title} · vs ${journey.opponent}` : ''}</span>
        </div>
        <div role="group" aria-label="Choisir la période" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1.5">
          {chips.map((chip) => {
            const active = chip.key === (journey ? journey.matchId : 'avg')
            return (
              <button key={chip.key} type="button" aria-pressed={active} onClick={() => setSelected(chip.key)}
                className={`relative flex min-h-14 snap-start flex-none flex-col items-center justify-center rounded-2xl border px-3 py-1.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)] ${chip.key === 'avg' ? 'min-w-[6.5rem]' : 'min-w-[4.25rem]'} ${active ? 'border-transparent bg-maroon-panel text-on-brand' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}>
                <span className="font-display text-2xl leading-none tracking-wide">{chip.label}</span>
                <span className={`text-[11px] font-bold tracking-[0.06em] ${active ? 'opacity-80' : 'text-[var(--ink-soft)]'}`}>{chip.sub}</span>
                {chip.key !== 'avg' && <span aria-hidden="true" className={`absolute right-2 top-2 size-2 rounded-full ${chip.result === 'win' ? 'bg-[var(--success)]' : chip.result === 'loss' ? 'bg-[var(--danger)]' : 'border border-current opacity-60'}`} />}
              </button>
            )
          })}
        </div>
      </div>

      {!journey && (
        <>
          <section aria-labelledby="avg-title" className="grid gap-2.5">
            <h2 id="avg-title" className={sectionTitle}>Moyennes par match</h2>
            <Kpis items={kpis(total, perGame)} />
          </section>
          <section aria-labelledby="shoot-title" className="grid gap-2.5">
            <h2 id="shoot-title" className={sectionTitle}>Efficacité aux tirs</h2>
            <ShootingRows rows={shooting(total)} />
          </section>
          <section aria-labelledby="others-title" className="grid gap-2.5">
            <h2 id="others-title" className={sectionTitle}>Autres moyennes</h2>
            <StatList rows={others(total, perGame)} />
          </section>
        </>
      )}

      {journey && line && (
        <>
          <div className={`${card} grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2`}>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{title}</p>
              <p className="truncate font-display text-4xl leading-none text-brand">vs {journey.opponent}</p>
            </div>
            <p className="font-display text-5xl leading-none text-brand tabular-nums">{hasScore ? `${journey.esiScore}–${journey.opponentScore}` : '—'}</p>
            <div className="col-span-2 flex flex-wrap gap-2">
              {hasScore && <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] ${won ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'}`}>{won ? 'Victoire' : 'Défaite'}</span>}
              {mvpMatchIds.includes(journey.matchId) && <span className="rounded-full bg-gold px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] text-gold-foreground">MVP du match</span>}
            </div>
          </div>
          <section aria-labelledby="match-kpi-title" className="grid gap-2.5">
            <h2 id="match-kpi-title" className={sectionTitle}>Ses stats dans ce match</h2>
            <Kpis items={kpis(line, String)} />
          </section>
          <section aria-labelledby="match-shoot-title" className="grid gap-2.5">
            <h2 id="match-shoot-title" className={sectionTitle}>Adresse dans ce match</h2>
            <ShootingRows rows={shooting(line)} />
          </section>
          <section aria-labelledby="match-others-title" className="grid gap-2.5">
            <h2 id="match-others-title" className={sectionTitle}>Autres statistiques</h2>
            <StatList rows={others(line, String)} />
          </section>
          <Link href={`/matchs/${journey.matchId}`} className={matchLink}>Voir le match complet</Link>
        </>
      )}

      {journey && !line && (
        <>
          <div className={`${card} text-center`}>
            <p className="font-display text-3xl leading-tight text-brand">N’a pas joué ce match</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">Il n’a pas de statistiques pour cette journée.</p>
          </div>
          <ScorePoster journey={journey} title={title} />
          <Link href={`/matchs/${journey.matchId}`} className={matchLink}>Voir le match complet</Link>
        </>
      )}
    </div>
  )
}
