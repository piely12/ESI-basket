const DAY = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MONTH = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export function formatMatchDate(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${DAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]} · ${h}h${m}`
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
