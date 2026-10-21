'use client'

import { useMemo, useState } from 'react'
import type { MatchRow } from '@/lib/data/public'
import MatchCard from '@/components/MatchCard'
import EmptyState from '@/components/ui/EmptyState'

type Filter = 'tous' | 'termines' | 'avenir'
type Scope = 'lions' | 'toutes'
type CalendarDay = { key: string; inMonth: boolean; count: number }

const WEEKDAYS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.']
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'termines', label: 'Terminés' },
  { id: 'avenir', label: 'À venir' },
]

function matchesFilter(match: MatchRow, day: string, filter: Filter, today: string) {
  if (filter === 'termines') return match.status === 'termine'
  if (filter === 'avenir') return day >= today && match.status !== 'termine'
  return true
}

function dateKey(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Abidjan', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function weekKey(key: string) {
  const date = new Date(`${key}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function calendarDays(monthKey: string, counts: Map<string, number>): CalendarDay[] {
  const [year, month] = monthKey.split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 1, 1))
  const firstCell = new Date(first)
  firstCell.setUTCDate(1 - ((first.getUTCDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell)
    date.setUTCDate(firstCell.getUTCDate() + index)
    const key = date.toISOString().slice(0, 10)
    return { key, inMonth: date.getUTCMonth() === month - 1, count: counts.get(key) ?? 0 }
  })
}

function changeMonth(monthKey: string, amount: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function shortDate(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', timeZone: 'Africa/Abidjan',
  })
}

function matchdayLabel(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Abidjan',
  })
}

export default function MatchList({
  matches,
  today,
  initialMonth,
}: {
  matches: MatchRow[]
  today: string
  initialMonth: string
}) {
  const [filter, setFilter] = useState<Filter>('tous')
  const [scope, setScope] = useState<Scope>('lions')
  const [viewMonth, setViewMonth] = useState(initialMonth)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const selectedWeek = selectedDate ? weekKey(selectedDate) : null

  const indexedMatches = useMemo(() => matches.map((match) => ({ match, day: dateKey(match.scheduled_at) })), [matches])
  const scopedMatches = useMemo(
    () => scope === 'lions' ? indexedMatches.filter(({ match }) => match.home_team.is_esi || match.away_team.is_esi) : indexedMatches,
    [indexedMatches, scope],
  )
  const countsByDay = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of scopedMatches) counts.set(item.day, (counts.get(item.day) ?? 0) + 1)
    return counts
  }, [scopedMatches])
  const days = useMemo(() => calendarDays(viewMonth, countsByDay), [viewMonth, countsByDay])

  const categoryMatches = scopedMatches.filter(({ match, day }) => matchesFilter(match, day, filter, today))
  const weekMatches = selectedWeek
    ? scopedMatches.filter(({ day }) => weekKey(day) === selectedWeek)
    : null
  const visibleMatches = categoryMatches
    .filter(({ day }) => !selectedWeek || weekKey(day) === selectedWeek)
    .sort((a, b) => {
      const aIsEsi = a.match.home_team.is_esi || a.match.away_team.is_esi
      const bIsEsi = b.match.home_team.is_esi || b.match.away_team.is_esi
      return Number(bIsEsi) - Number(aIsEsi)
        || a.day.localeCompare(b.day)
        || a.match.scheduled_at.localeCompare(b.match.scheduled_at)
    })
  const matchdayGroups = Array.from(visibleMatches.reduce((groups, item) => {
    const key = `${item.match.round_number ?? 'other'}-${item.day}`
    const group = groups.get(key) ?? { round: item.match.round_number, day: item.day, matches: [] as typeof visibleMatches }
    group.matches.push(item)
    groups.set(key, group)
    return groups
  }, new Map<string, { round: number | null; day: string; matches: typeof visibleMatches }>()).values())

  const monthLabel = new Date(`${viewMonth}-01T12:00:00Z`).toLocaleDateString('fr-FR', {
    month: 'long', year: 'numeric', timeZone: 'Africa/Abidjan',
  })
  const weekEnd = selectedWeek
    ? new Date(Date.parse(`${selectedWeek}T00:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10)
    : null

  function chooseFilter(nextFilter: Filter) {
    setFilter(nextFilter)
    const filtered = indexedMatches.filter(({ match, day }) => matchesFilter(match, day, nextFilter, today))
    if (filtered.length) {
      const target = nextFilter === 'termines' ? filtered[filtered.length - 1] : filtered[0]
      setViewMonth(target.day.slice(0, 7))
    }
  }

  return (
    <div className="space-y-5">
      <section aria-label="Filtres et liste des matchs" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par période">
            {FILTERS.map((item) => <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => chooseFilter(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === item.id ? 'bg-maroon-panel text-on-brand dark:bg-gold dark:text-gold-foreground' : 'bg-[var(--line)]/50 text-[var(--ink)] hover:bg-[var(--line)] dark:border dark:border-gold/25 dark:bg-muted dark:text-foreground dark:hover:border-gold/50 dark:hover:bg-muted'}`}
            >{item.label}</button>)}
          </div>

          <div className="relative ml-auto">
            <button
              type="button"
              aria-label={calendarOpen ? 'Fermer le calendrier' : 'Ouvrir le calendrier des matchs'}
              aria-expanded={calendarOpen}
              aria-haspopup="dialog"
              aria-controls="match-calendar-popover"
              onClick={() => setCalendarOpen((open) => !open)}
              className={`grid size-11 place-items-center rounded-xl border transition ${calendarOpen || selectedDate ? 'border-[var(--maroon-900)] bg-maroon-panel text-on-brand dark:border-gold dark:bg-gold dark:text-gold-foreground' : 'border-[var(--line)] bg-[var(--surface)] text-brand hover:border-[var(--gold-deep)] hover:bg-[var(--paper)] dark:border-gold/35 dark:bg-card dark:text-gold dark:hover:border-gold'}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
                <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
              </svg>
            </button>

            {calendarOpen && <div
              id="match-calendar-popover"
              role="dialog"
              aria-label="Calendrier pour filtrer les matchs"
              className="absolute right-0 z-50 mt-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl"
              style={{ width: 'min(20rem, calc(100vw - 2rem))' }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-2xl capitalize text-brand">{monthLabel}</h2>
                <div className="flex gap-1">
                  <button type="button" aria-label="Mois précédent" onClick={() => setViewMonth((month) => changeMonth(month, -1))} className="min-h-9 rounded-full border border-[var(--line)] px-2 text-xs font-semibold text-brand hover:bg-[var(--paper)]">Précédent</button>
                  <button type="button" aria-label="Mois suivant" onClick={() => setViewMonth((month) => changeMonth(month, 1))} className="min-h-9 rounded-full border border-[var(--line)] px-2 text-xs font-semibold text-brand hover:bg-[var(--paper)]">Suivant</button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[var(--ink-soft)]">
                {WEEKDAYS.map((day) => <span key={day} className="py-1">{day}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1" role="group" aria-label={`Calendrier des matchs, ${monthLabel}`}>
                {days.map((day) => {
                  const selected = selectedDate === day.key
                  const inSelectedWeek = selectedWeek === weekKey(day.key)
                  const label = new Date(`${day.key}T12:00:00Z`).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Abidjan',
                  })
                  return <button
                    key={day.key}
                    type="button"
                    aria-label={`${label}${day.count ? `, ${day.count} match${day.count > 1 ? 's' : ''}` : ', aucun match'}`}
                    aria-pressed={selected}
                    aria-current={day.key === today ? 'date' : undefined}
                    onClick={() => {
                      setSelectedDate((current) => current === day.key ? null : day.key)
                      if (!day.inMonth) setViewMonth(day.key.slice(0, 7))
                    }}
                    className={`relative mx-auto grid aspect-square w-full max-w-9 place-items-center rounded-full text-xs transition ${selected ? 'bg-maroon-panel font-bold text-on-brand dark:bg-gold dark:text-gold-foreground' : inSelectedWeek ? 'bg-[var(--gold-500)]/25 text-brand' : day.inMonth ? 'text-[var(--ink)] hover:bg-[var(--paper)]' : 'text-[var(--ink-soft)]/50 hover:bg-[var(--paper)]'}`}
                  >
                    {Number(day.key.slice(-2))}
                    {day.count > 0 && <span aria-hidden="true" className={`absolute bottom-0.5 size-1 rounded-full ${selected ? 'bg-on-brand' : 'bg-[var(--gold-deep)]'}`} />}
                  </button>
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-xs text-[var(--ink-soft)]">
                <span><span className="mr-1 inline-block size-2 rounded-full bg-[var(--gold-deep)]" />Match programmé</span>
                {selectedDate && <button type="button" onClick={() => setSelectedDate(null)} className="font-semibold text-brand underline underline-offset-2">Tout afficher</button>}
              </div>
            </div>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Écoles affichées">
          {([{ id: 'lions', label: 'Les Lions' }, { id: 'toutes', label: 'Toutes les écoles' }] as const).map((item) => <button
            key={item.id}
            type="button"
            aria-pressed={scope === item.id}
            onClick={() => setScope(item.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${scope === item.id ? 'border-brand bg-brand text-primary-foreground dark:border-gold dark:bg-gold dark:text-gold-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
          >{item.label}</button>)}
        </div>

        {selectedWeek && weekEnd && <p className="text-sm font-semibold text-brand">Semaine du {shortDate(selectedWeek)} au {shortDate(weekEnd)}</p>}

        {matches.length === 0 ? (
          <EmptyState title="Le calendrier est vide" description="Les matchs apparaîtront ici dès leur programmation." />
        ) : selectedWeek && weekMatches?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--ink-soft)]">
            Aucun match programmé cette semaine.
          </div>
        ) : visibleMatches.length ? (
          <div className="space-y-5">
            {matchdayGroups.map((group) => <section key={`${group.round ?? 'autres'}-${group.day}`} aria-label={`${group.round ? `Journée ${group.round}` : 'Matchs'} · ${matchdayLabel(group.day)}`}>
              <h2 className="mb-2 flex items-center gap-2 font-display text-xl text-brand">
                <span>{group.round ? `Journée ${group.round}` : 'Matchs'}</span>
                <span aria-hidden="true" className="text-muted-foreground">·</span>
                <span className="font-sans text-sm font-semibold text-muted-foreground">{matchdayLabel(group.day)}</span>
              </h2>
              <div className="grid gap-2">
                {group.matches.map(({ match }) => <MatchCard key={match.id} match={match} compact showShare={false} />)}
              </div>
            </section>)}
          </div>
        ) : selectedWeek ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--ink-soft)]">
            {filter === 'avenir' ? 'Aucun match à venir cette semaine.' : filter === 'termines' ? 'Aucun match terminé cette semaine.' : 'Aucun match cette semaine.'}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--ink-soft)]">
            {filter === 'avenir' ? 'Aucun match à venir pour le moment.' : filter === 'termines' ? 'Aucun match terminé dans le calendrier.' : 'Aucun match dans le calendrier pour le moment.'}
          </div>
        )}
      </section>

    </div>
  )
}
