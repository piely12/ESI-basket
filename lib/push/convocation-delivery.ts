import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { vapidPublicKey } from '@/lib/push/config'
import { sendWebPush } from '@/lib/push/webpush'
import { convocationMessage, type ConvocationEvent } from '@/lib/push/match-reminder'

/*
 * Envoie sur le téléphone des joueurs la convocation que la base vient de créer
 * (migration 041). Appelé après la publication de la composition ; ne lève jamais
 * d'erreur : la composition reste publiée même si une notification échoue.
 * Chaque notification n'est envoyée qu'une fois (colonne push_sent_at).
 */

type PendingRow = { id: string; user_id: string | null; event_type: ConvocationEvent; publication_version: number }
type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
type NamedTeam = { name: string } | { name: string }[] | null

const first = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] ?? null : value)
const BATCH = 10

export async function deliverConvocationPushes(matchId: string, teamId: string): Promise<{ sent: number; skipped: number }> {
  try {
    const admin = createAdminClient()
    const publicKey = vapidPublicKey()
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
    if (!publicKey || !privateKey || !process.env.VAPID_SUBJECT?.trim()) {
      console.error('[push] Convocation push skipped: VAPID is not configured')
      return { sent: 0, skipped: 0 }
    }

    const { data: pending, error } = await admin.from('match_composition_notifications')
      .select('id,user_id,event_type,publication_version')
      .eq('match_id', matchId).eq('team_id', teamId).eq('status', 'envoyee').is('push_sent_at', null)
    if (error) throw error
    const rows = (pending ?? []) as PendingRow[]
    if (!rows.length) return { sent: 0, skipped: 0 }

    const { data: matchRow, error: matchError } = await admin.from('matches')
      .select('id,scheduled_at,kickoff_confirmed,location,home_team_id,away_team_id,home:teams!matches_home_team_id_fkey(name),away:teams!matches_away_team_id_fkey(name)')
      .eq('id', matchId).maybeSingle()
    if (matchError || !matchRow) throw matchError ?? new Error('match introuvable')
    const opponent = matchRow.home_team_id === teamId ? first(matchRow.away as NamedTeam) : first(matchRow.home as NamedTeam)
    const match = {
      id: matchRow.id as string, scheduledAt: matchRow.scheduled_at as string, kickoffConfirmed: Boolean(matchRow.kickoff_confirmed),
      opponent: opponent?.name ?? null, location: (matchRow.location as string | null) ?? null,
    }

    // Une seule notification par joueur : la plus récente.
    const latestByUser = new Map<string, PendingRow>()
    for (const row of rows) {
      if (!row.user_id) continue
      const current = latestByUser.get(row.user_id)
      if (!current || row.publication_version > current.publication_version) latestByUser.set(row.user_id, row)
    }
    const userIds = [...latestByUser.keys()]
    const { data: subscriptionRows, error: subscriptionError } = userIds.length
      ? await admin.from('player_push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', userIds)
      : { data: [], error: null }
    if (subscriptionError) throw subscriptionError
    const subscriptions = (subscriptionRows ?? []) as Subscription[]

    let sent = 0
    const deliveries = subscriptions.flatMap((subscription) => {
      const row = latestByUser.get(subscription.user_id)
      return row ? [{ subscription, payload: JSON.stringify(convocationMessage(row.event_type, match)) }] : []
    })
    for (let index = 0; index < deliveries.length; index += BATCH) {
      await Promise.all(deliveries.slice(index, index + BATCH).map(async ({ subscription, payload }) => {
        try {
          await sendWebPush({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, publicKey, privateKey)
          sent += 1
        } catch (sendError) {
          const statusCode = (sendError as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) await admin.from('player_push_subscriptions').delete().eq('id', subscription.id)
          else console.error('[push] Convocation delivery failed', statusCode ?? 'unknown')
        }
      }))
    }

    // Les joueurs sans appareil abonné gardent la notification dans l'app : on ne renvoie rien plus tard.
    await admin.from('match_composition_notifications').update({ push_sent_at: new Date().toISOString() }).in('id', rows.map((row) => row.id))
    return { sent, skipped: rows.length - latestByUser.size }
  } catch (error) {
    console.error('[push] Convocation pushes failed', error instanceof Error ? error.message : 'unknown')
    return { sent: 0, skipped: 0 }
  }
}
