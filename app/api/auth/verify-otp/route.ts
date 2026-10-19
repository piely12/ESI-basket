import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashOtp, safeEqualHex, signResetToken } from '@/lib/auth/otp'
import { json, assertSameOrigin, clientIp, clientUserAgent, rlKey, consumeRateLimit, audit } from '@/lib/security'

const INVALID = { error: 'Code invalide ou expiré.' }
const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().regex(/^\d{6}$/),
}).strict()
const WINDOW_SECONDS = 15 * 60

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked
  let body: unknown
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > 2048) return json(INVALID, 400)
    body = JSON.parse(raw)
  } catch {
    return json(INVALID, 400)
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return json(INVALID, 400)

  const admin = createAdminClient()
  const ip = clientIp(request)
  const ipLimit = await consumeRateLimit(admin, rlKey('otp-verify-ip', ip), 20, WINDOW_SECONDS)
  if (!ipLimit.allowed) return json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429, {
    'Retry-After': String(ipLimit.retryAfterSeconds),
  })

  const { data: userId, error: lookupError } = await admin.rpc('linked_auth_user_by_email', {
    p_email: parsed.data.email,
  })
  if (lookupError) return json({ error: 'Vérification indisponible. Réessayez.' }, 503)
  if (!userId) return json(INVALID, 400)

  const accountLimit = await consumeRateLimit(admin, rlKey('otp-verify-account', userId), 10, WINDOW_SECONDS)
  if (!accountLimit.allowed) return json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429, {
    'Retry-After': String(accountLimit.retryAfterSeconds),
  })

  const { data: otp, error: otpLookupError } = await admin
    .from('otp_codes').select('id')
    .eq('user_id', userId).is('used_at', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (otpLookupError) return json({ error: 'Vérification indisponible. Réessayez.' }, 503)
  if (!otp) return json(INVALID, 400)

  const { data: attemptsData, error: consumeError } = await admin.rpc('consume_otp_attempt', {
    p_otp_id: otp.id,
  })
  if (consumeError) return json({ error: 'Vérification indisponible. Réessayez.' }, 503)
  const attempt = attemptsData?.[0]
  if (!attempt) return json(INVALID, 400)

  if (!safeEqualHex(attempt.code_hash, hashOtp(attempt.user_id, parsed.data.code))) {
    await audit(admin, 'otp_verification_failed', userId, {
      ip,
      userAgent: clientUserAgent(request),
      metadata: { attempts: attempt.attempts },
    })
    return json(INVALID, 400)
  }

  await audit(admin, 'otp_verification_succeeded', userId, { ip, userAgent: clientUserAgent(request) })
  return json({ ok: true, resetToken: signResetToken(otp.id, userId) })
}
