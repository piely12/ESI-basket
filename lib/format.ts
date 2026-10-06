const MONTH = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export function formatMatchDate(iso: string, kickoffConfirmed = true): string {
  const value = new Date(iso)
  const parts = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Abidjan',
  }).formatToParts(value)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  const date = `${part('weekday')} ${part('day')} ${part('month')}`
  if (!kickoffConfirmed) return date
  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Abidjan',
  }).format(value).replace(':', 'h')
  return `${date} · ${time}`
}

export function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTH[d.getMonth()]}`
}

export function pct(made: number, attempted: number): string {
  if (!attempted) return '—'
  return `${Math.round((made / attempted) * 100)}%`
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}
