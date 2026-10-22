import { createAdminClient } from '@/lib/supabase/admin'
import { sendWebPush } from '@/lib/push/webpush'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return Response.json({ error: 'push_not_configured' }, { status: 503 })

  try {
    const admin = createAdminClient()
    const today = new Date()
    const weekday = today.getUTCDay()
    if (weekday !== 6) return Response.json({ ok: true, sent: 0, reason: 'not_saturday' })

    const date = today.toISOString().slice(0, 10)
    const start = new Date(`${date}T00:00:00.000Z`).toISOString()
    const end = new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000).toISOString()
    const { data: esi, error: teamError } = await admin.from('teams').select('id').eq('is_esi', true).maybeSingle()
    if (teamError) throw teamError
    if (!esi) return Response.json({ ok: true, sent: 0, reason: 'esi_not_found' })

    const { data: matches, error: matchesError } = await admin.from('matches')
      .select('id,scheduled_at,location,home_team_id,away_team_id,home:teams!matches_home_team_id_fkey(name),away:teams!matches_away_team_id_fkey(name)')
      .in('status', ['programme', 'a_venir', 'jour_j', 'en_cours'])
      .or(`home_team_id.eq.${esi.id},away_team_id.eq.${esi.id}`)
      .gte('scheduled_at', start)
      .lt('scheduled_at', end)
      .order('scheduled_at', { ascending: true })
    if (matchesError) throw matchesError
    if (!matches?.length) return Response.json({ ok: true, sent: 0, reason: 'no_esi_match_today' })

    const matchLines = matches.map((match) => {
      const home = Array.isArray(match.home) ? match.home[0] : match.home
      const away = Array.isArray(match.away) ? match.away[0] : match.away
      const opponent = match.home_team_id === esi.id ? away : home
      const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' }).format(new Date(match.scheduled_at))
      return `ESI – ${opponent?.name ?? 'match'} à ${time}${match.location ? ` (${match.location})` : ''}`
    })
    const { data: subscriptions, error: subsError } = await admin.from('match_reminder_subscriptions').select('id,endpoint,p256dh,auth')
    if (subsError) throw subsError

    let sent = 0
    for (const subscription of subscriptions ?? []) {
      const { data: claim, error: claimError } = await admin.from('match_reminder_weekly_deliveries')
        .insert({ match_date: date, subscription_id: subscription.id }).select('subscription_id').maybeSingle()
      if (claimError?.code === '23505') continue
      if (claimError) throw claimError
      if (!claim) continue

      const payload = {
        title: matches.length === 1 ? 'Les Lions jouent aujourd’hui !' : `Les Lions ont ${matches.length} matchs aujourd’hui`,
        body: matchLines.join(' · ').slice(0, 900),
        url: '/matchs',
      }
      try {
        await sendWebPush({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), publicKey, privateKey)
        sent += 1
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        await admin.from('match_reminder_weekly_deliveries').delete().eq('match_date', date).eq('subscription_id', subscription.id)
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('match_reminder_subscriptions').delete().eq('id', subscription.id)
        } else {
          console.error('[push] Weekly reminder delivery failed', statusCode ?? 'unknown')
        }
      }
    }
    return Response.json({ ok: true, sent, matchCount: matches.length, date })
  } catch (error) {
    console.error('[push] Weekly reminder job failed', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'unavailable' }, { status: 500 })
  }
}
