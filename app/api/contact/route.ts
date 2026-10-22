import { NextRequest } from 'next/server'
import { z } from 'zod'
import { assertSameOrigin, clientIp, consumeRateLimit, json, rlKey } from '@/lib/security'
import { createAdminClient } from '@/lib/supabase/admin'

const ContactMessage = z.object({
  message: z.string().trim().min(5).max(1000),
}).strict()

export async function POST(request: NextRequest) {
  const rejected = assertSameOrigin(request)
  if (rejected) return rejected

  const length = Number(request.headers.get('content-length') ?? '0')
  if (length > 8 * 1024) return json({ error: 'invalid' }, 413)
  let raw: unknown
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).byteLength > 8 * 1024) return json({ error: 'invalid' }, 413)
    raw = JSON.parse(body)
  } catch {
    return json({ error: 'invalid' }, 400)
  }
  const parsed = ContactMessage.safeParse(raw)
  if (!parsed.success) return json({ error: 'invalid' }, 400)

  try {
    const admin = createAdminClient()
    const ipKey = rlKey('public-contact', clientIp(request))
    const globalKey = rlKey('public-contact-global', new Date().toISOString().slice(0, 13))
    const [ipLimit, globalLimit] = await Promise.all([
      consumeRateLimit(admin, ipKey, 5, 60 * 60),
      consumeRateLimit(admin, globalKey, 120, 60 * 60),
    ])
    if (!ipLimit.allowed || !globalLimit.allowed) {
      return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(Math.max(ipLimit.retryAfterSeconds, globalLimit.retryAfterSeconds)) })
    }
    const { error } = await admin.from('contact_messages').insert({ message: parsed.data.message })
    if (error) throw error
    return json({ ok: true })
  } catch (error) {
    console.error('[contact] Message could not be stored', error instanceof Error ? error.message : 'unknown')
    return json({ error: 'unavailable' }, 503)
  }
}
