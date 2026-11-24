/**
 * Texte et lien de la notification « jour de match ».
 *
 * Titre : « Jour de Match à ESI Land. »
 * Texte : « Les Lions affrontent l’ESCAE à 18h »
 * Un clic ouvre la page du match, directement sur la composition.
 */

export type ReminderMatch = {
  id: string
  scheduledAt: string
  opponent: string | null
  location: string | null
}

const TIME_ZONE = 'Africa/Abidjan'
export const MATCH_REMINDER_TITLE = 'Jour de Match à ESI Land.'

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

export function matchReminderSentence(match: ReminderMatch) {
  const opponent = match.opponent?.trim() ? withArticle(match.opponent) : 'leur adversaire'
  return `Les Lions affrontent ${opponent} à ${formatMatchTime(match.scheduledAt)}`
}

export function matchReminderUrl(match: Pick<ReminderMatch, 'id'>) {
  return `/matchs/${encodeURIComponent(match.id)}#composition`
}

/** Une notification par jour : les matchs du jour s’enchaînent, le lien ouvre le premier. */
export function buildMatchReminderPayload(matches: ReminderMatch[]) {
  return {
    title: MATCH_REMINDER_TITLE,
    body: matches.map(matchReminderSentence).join(' · ').slice(0, 900),
    url: matchReminderUrl(matches[0]),
  }
}
