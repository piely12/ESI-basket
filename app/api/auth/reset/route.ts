import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyResetToken } from '@/lib/auth/otp'
import { validateNewPassword } from '@/lib/validation'
import { json, assertSameOrigin, clientIp, clientUserAgent, rlKey, consumeRateLimit, audit } from '@/lib/security'

const requestSchema = z.object({
  resetToken: z.string().min(1).max(2048),
  password: z.string().min(1).max(256),
}).strict()

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked
  let body: unknown
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > 4096) return json({ error: 'Session expirée. Recommencez.' }, 400)
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'Session expirée. Recommencez.' }, 400)
  }
  const parsedInput = requestSchema.safeParse(body)
  if (!parsedInput.success) return json({ error: 'Session expirée. Recommencez.' }, 400)
  const reset = verifyResetToken(parsedInput.data.resetToken)
  if (!reset) return json({ error: 'Session expirée. Recommencez.' }, 400)

  const admin = createAdminClient()
  const ip = clientIp(request)
  const ipLimit = await consumeRateLimit(admin, rlKey('otp-reset-ip', ip), 10, 15 * 60)
  const userLimit = await consumeRateLimit(admin, rlKey('otp-reset-user', reset.userId), 5, 15 * 60)
  if (!ipLimit.allowed || !userLimit.allowed) {
    return json({ error: 'Trop de tentatives. Recommencez plus tard.' }, 429, {
      'Retry-After': String(Math.max(ipLimit.retryAfterSeconds, userLimit.retryAfterSeconds)),
    })
  }

  const { data: authResult, error: authLookupError } = await admin.auth.admin.getUserById(reset.userId)
  if (authLookupError || !authResult.user) return json({ error: 'Session expirée. Recommencez.' }, 400)
  const passwordError = validateNewPassword(parsedInput.data.password, authResult.user.email ?? undefined)
  if (passwordError) return json({ error: passwordError }, 400)

  const { data: consumed, error: consumeError } = await admin
    .from('otp_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', reset.otpId).eq('user_id', reset.userId).is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id')
  if (consumeError || !consumed?.length) return json({ error: 'Session expirée. Recommencez.' }, 400)

  const { error: passwordUpdateError } = await admin.auth.admin.updateUserById(reset.userId, {
    password: parsedInput.data.password,
  })
  if (passwordUpdateError) return json({ error: 'Impossible de changer le mot de passe.' }, 503)

  await admin.from('active_sessions').delete().eq('user_id', reset.userId)
  await audit(admin, 'password_reset', reset.userId, { ip, userAgent: clientUserAgent(request) })
  return json({ ok: true })
}
