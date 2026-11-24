import { NextRequest } from 'next/server'
import { z } from 'zod'
import { assertSameOrigin, clientIp, consumeRateLimit, json, rlKey } from '@/lib/security'
import { createAdminClient } from '@/lib/supabase/admin'

// PushSubscription.toJSON() also contains `expirationTime` (usually null) in
// Chrome, Edge, Firefox and Safari: it must be accepted, or every browser is refused.
const Subscription = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(20).max(256), auth: z.string().min(10).max(128) }).strict(),
}).strict()
const Endpoint = z.object({ endpoint: z.string().url().max(2048) }).strict()

/** Supabase errors are plain objects: keep their code and message for the logs. */
function describe(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: string; message?: string }
    return [code, message].filter(Boolean).join(' ') || 'unknown'
  }
  return 'unknown'
}

export async function POST(request: NextRequest) {
  const rejected = assertSameOrigin(request)
  if (rejected) return rejected
  const parsed = Subscription.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid' }, 400)

  const admin = createAdminClient()
  try {
    const limit = await consumeRateLimit(admin, rlKey('push-subscribe', clientIp(request)), 10, 60 * 60)
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429)
  } catch (error) {
    // A subscription is harmless and idempotent (upsert on endpoint): if the
    // shared limiter is down, do not block notifications for everyone.
    console.error('[push] Rate limiter unavailable, subscription allowed', describe(error))
  }

  const { error } = await admin.from('match_reminder_subscriptions').upsert({
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  }, { onConflict: 'endpoint' })
  if (error) {
    console.error('[push] Subscription could not be stored', describe(error))
    return json({ error: 'unavailable' }, 503)
  }
  return json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const rejected = assertSameOrigin(request)
  if (rejected) return rejected
  const parsed = Endpoint.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid' }, 400)
  const { error } = await createAdminClient().from('match_reminder_subscriptions').delete().eq('endpoint', parsed.data.endpoint)
  if (error) {
    console.error('[push] Subscription could not be removed', describe(error))
    return json({ error: 'unavailable' }, 503)
  }
  return json({ ok: true })
}
