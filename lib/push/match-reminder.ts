/**
 * Texte et lien de la notification « jour de match ».
 *
 * Exemple : « Les Lions 🦁 de l’ESI affrontent l’ESCAE à 18h au gymnase du Sud. »
 * Un clic ouvre la page du match, directement sur la composition.
 */

export type ReminderMatch = {
  id: string
  scheduledAt: string
  opponent: string | null
  location: string | null
}

const TIME_ZONE = 'Africa/Abidjan'
export const MATCH_REMINDER_TITLE = 'Jour de match à ESI-Land.'

/** « l’ESCAE », « l’E. Projet » ; sans article si le nom ne commence pas par une voyelle. */
export function withArticle(team: string) {
  const name = team.trim()
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(name) ? `l’${name}` : name
}

/** « 18h », « 18h30 » (heure d’Abidjan). */
export function formatMatchTime(iso: string) {
  const parts = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE })
    .formatToParts(new Date(iso))
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return minute === '00' ? `${hour}h` : `${hour}h${minute}`
}

const MASCULINE = /^(gymnase|palais|stade|terrain|complexe|centre|dôme|dome|parquet|campus)\b/i
const FEMININE = /^(salle|halle|arène|arene|cour|maison|base)\b/i

/** « au gymnase du Sud », « à la salle omnisports », « à Cocody ». */
export function formatVenue(location: string) {
  const place = location.trim()
  if (MASCULINE.test(place)) return `au ${place.charAt(0).toLowerCase()}${place.slice(1)}`
  if (FEMININE.test(place)) return `à la ${place.charAt(0).toLowerCase()}${place.slice(1)}`
  return `à ${place}`
}

export function matchReminderSentence(match: ReminderMatch) {
  const opponent = match.opponent ? ` ${withArticle(match.opponent)}` : ''
  const venue = match.location?.trim() ? ` ${formatVenue(match.location)}` : ''
  return `Les Lions 🦁 de l’ESI affrontent${opponent || ' leur adversaire'} à ${formatMatchTime(match.scheduledAt)}${venue}.`
}

export function matchReminderUrl(match: Pick<ReminderMatch, 'id'>) {
  return `/matchs/${encodeURIComponent(match.id)}#composition`
}

/** Une notification par jour : les matchs du jour s’enchaînent, le lien ouvre le premier. */
export function buildMatchReminderPayload(matches: ReminderMatch[]) {
  return {
    title: MATCH_REMINDER_TITLE,
    body: matches.map(matchReminderSentence).join(' ').slice(0, 900),
    url: matchReminderUrl(matches[0]),
  }
}
