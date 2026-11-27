import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import { assertSameOrigin, consumeRateLimit, json, rlKey } from '@/lib/security'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/*
 * Appareil d'un joueur connecté pour recevoir ses convocations sur son téléphone.
 * Le joueur est identifié par sa session ; le serveur écrit ensuite avec le rôle de service.
 */

const Subscription = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(20).max(256), auth: z.string().min(10).max(128) }).strict(),
}).strict()
const Endpoint = z.object({ endpoint: z.string().url().max(2048) }).strict()

async function currentPlayerId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await getCurrentUserProfile(supabase).catch(() => null)
  return profile?.role === 'joueur' ? user.id : null
}

export async function POST(request: NextRequest) {
  const rejected = assertSameOrigin(request)
  if (rejected) return rejected
  const userId = await currentPlayerId()
  if (!userId) return json({ error: 'unauthorized' }, 401)
  const parsed = Subscription.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid' }, 400)

  const admin = createAdminClient()
  try {
    const limit = await consumeRateLimit(admin, rlKey('player-push-subscribe', userId), 10, 60 * 60)
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429)
  } catch (error) {
    console.error('[push] Rate limiter unavailable, player subscription allowed', error instanceof Error ? error.message : 'unknown')
  }

  // Un appareil appartient au dernier joueur connecté dessus (téléphone partagé).
  const { error } = await admin.from('player_push_subscriptions').upsert({
    user_id: userId, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth,
  }, { onConflict: 'endpoint' })
  if (error) {
    console.error('[push] Player subscription could not be stored', error.code ?? 'unknown')
    return json({ error: 'unavailable', code: error.code || 'database' }, 503)
  }
  return json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const rejected = assertSameOrigin(request)
  if (rejected) return rejected
  const userId = await currentPlayerId()
  if (!userId) return json({ error: 'unauthorized' }, 401)
  const parsed = Endpoint.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid' }, 400)
  const { error } = await createAdminClient().from('player_push_subscriptions').delete().eq('endpoint', parsed.data.endpoint).eq('user_id', userId)
  if (error) return json({ error: 'unavailable' }, 503)
  return json({ ok: true })
}
