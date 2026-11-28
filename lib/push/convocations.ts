import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendWebPush } from '@/lib/push/webpush'
import { vapidPublicKey } from '@/lib/push/config'
import { formatMatchTime, withArticle } from '@/lib/push/match-reminder'

type CompositionNotification = { id: string; user_id: string | null; event_type: string }

const dayLabel = (iso: string) => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Abidjan',
}).format(new Date(iso))

/**
 * Envoie en push les convocations créées par la publication d'une composition,
 * uniquement sur les appareils des joueurs concernés. Chaque convocation n'est
 * envoyée qu'une fois (colonne pushed_at). Ne lève jamais d'erreur : la
 * publication de la composition est déjà enregistrée.
 */
export async function pushConvocations(matchId: string, teamId: string) {
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const publicKey = vapidPublicKey()
  if (!privateKey || !publicKey || !process.env.VAPID_SUBJECT?.trim()) return

  try {
    const admin = createAdminClient()
    const { data: pending, error } = await admin.from('match_composition_notifications')
      .select('id,user_id,event_type')
      .eq('match_id', matchId).eq('team_id', teamId)
      .eq('status', 'envoyee').is('pushed_at', null).not('user_id', 'is', null)
    if (error) throw error
    if (!pending?.length) return

    const { data: match, error: matchError } = await admin.from('matches')
      .select('id,scheduled_at,kickoff_confirmed,home_team_id,home:teams!matches_home_team_id_fkey(name),away:teams!matches_away_team_id_fkey(name)')
      .eq('id', matchId).maybeSingle()
    if (matchError || !match) throw matchError ?? new Error('match not found')
    const home = Array.isArray(match.home) ? match.home[0] : match.home
    const away = Array.isArray(match.away) ? match.away[0] : match.away
    const opponent = (match.home_team_id === teamId ? away?.name : home?.name) ?? 'l’adversaire'
    const when = dayLabel(match.scheduled_at) + (match.kickoff_confirmed ? ` à ${formatMatchTime(match.scheduled_at)}` : '')
    const url = `/matchs/${encodeURIComponent(matchId)}#composition`

    for (const notification of pending as CompositionNotification[]) {
      // Claim first so that two publications in a row never send it twice.
      const { data: claimed } = await admin.from('match_composition_notifications')
        .update({ pushed_at: new Date().toISOString() })
        .eq('id', notification.id).is('pushed_at', null).select('id').maybeSingle()
      if (!claimed || !notification.user_id) continue

      const removed = notification.event_type === 'selection_retiree'
      const payload = JSON.stringify(removed
        ? { title: 'Mise à jour de la sélection', body: `Tu ne fais plus partie des 12 contre ${withArticle(opponent)}, ${when}.`, url }
        : { title: 'Tu es convoqué ! 🦁', body: `Les Lions affrontent ${withArticle(opponent)} ${when}. Touche pour voir la composition.`, url })

      const { data: devices } = await admin.from('match_reminder_subscriptions')
        .select('id,endpoint,p256dh,auth').eq('user_id', notification.user_id)
      for (const device of devices ?? []) {
        try {
          await sendWebPush({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, publicKey, privateKey)
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) await admin.from('match_reminder_subscriptions').delete().eq('id', device.id)
          else console.error('[push] Convocation delivery failed', statusCode ?? 'unknown')
        }
      }
    }
  } catch (error) {
    console.error('[push] Convocation push failed', error instanceof Error ? error.message : 'unknown')
  }
}
