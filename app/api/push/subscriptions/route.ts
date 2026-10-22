import { NextRequest } from 'next/server'
import { z } from 'zod'
import { assertSameOrigin, clientIp, consumeRateLimit, json, rlKey } from '@/lib/security'
import { createAdminClient } from '@/lib/supabase/admin'

const Subscription = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(20).max(256), auth: z.string().min(10).max(128) }).strict(),
}).strict()
const Endpoint = z.object({ endpoint: z.string().url().max(2048) }).strict()

export async function POST(request: NextRequest) {
  const rejected = assertSameOrigin(request)
  if (rejected) return rejected
  const parsed = Subscription.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid' }, 400)
  try {
    const admin = createAdminClient()
    const limit = await consumeRateLimit(admin, rlKey('push-subscribe', clientIp(request)), 10, 60 * 60)
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429)
    const { error } = await admin.from('match_reminder_subscriptions').upsert({
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    }, { onConflict: 'endpoint' })
    if (error) throw error
    return json({ ok: true })
  } catch (error) {
    console.error('[push] Subscription could not be stored', error instanceof Error ? error.message : 'unknown')
    return json({ error: 'unavailable' }, 503)
  }
}

export async function DELETE(request: NextRequest) {
  const rejected = assertSameOrigin(request)
  if (rejected) return rejected
  const parsed = Endpoint.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid' }, 400)
  try {
    const { error } = await createAdminClient().from('match_reminder_subscriptions').delete().eq('endpoint', parsed.data.endpoint)
    if (error) throw error
    return json({ ok: true })
  } catch (error) {
    console.error('[push] Subscription could not be removed', error instanceof Error ? error.message : 'unknown')
    return json({ error: 'unavailable' }, 503)
  }
}
