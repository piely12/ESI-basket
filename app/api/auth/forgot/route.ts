import { after, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, hashOtp, OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS, OTP_WINDOW_MINUTES } from '@/lib/auth/otp'
import { sendOtpEmail } from '@/lib/auth/brevo'
import { json, assertSameOrigin, clientIp, clientUserAgent, rlKey, consumeRateLimit, audit } from '@/lib/security'

const GENERIC = { ok: true, message: "Si un compte existe pour cet e-mail, un code vient d'être envoyé." }
const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
}).strict()

async function keepMinimumResponseTime(startedAt: number) {
  const remaining = 250 - (Date.now() - startedAt)
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining))
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked
  const startedAt = Date.now()

  let body: unknown
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > 2048) return json({ error: 'E-mail invalide.' }, 400)
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'E-mail invalide.' }, 400)
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'E-mail invalide.' }, 400)

  try {
    const admin = createAdminClient()
    const ip = clientIp(request)
    const windowSeconds = OTP_WINDOW_MINUTES * 60
    const ipLimit = await consumeRateLimit(admin, rlKey('forgot-ip', ip), 10, windowSeconds)
    if (!ipLimit.allowed) {
      return json({ error: 'Trop de demandes. Réessayez plus tard.' }, 429, {
        'Retry-After': String(ipLimit.retryAfterSeconds),
      })
    }

    const { data: userId, error: lookupError } = await admin.rpc('linked_auth_user_by_email', {
      p_email: parsed.data.email,
    })
    if (lookupError) throw new Error('Account lookup unavailable')
    if (userId) {
      const accountLimit = await consumeRateLimit(admin, rlKey('forgot-account', userId), 3, windowSeconds)
      if (accountLimit.allowed) {
        const code = generateOtp()
        const { data: otpId, error: issueError } = await admin.rpc('issue_recovery_otp', {
          p_user_id: userId,
          p_code_hash: hashOtp(userId, code),
          p_expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
          p_max_attempts: OTP_MAX_ATTEMPTS,
        })
        if (issueError || !otpId) throw new Error('OTP issuance unavailable')

        const ipAddress = ip
        const userAgent = clientUserAgent(request)
        after(async () => {
          try {
            await sendOtpEmail(parsed.data.email, code, OTP_TTL_MINUTES)
            await audit(admin, 'otp_requested', userId, { ip: ipAddress, userAgent })
          } catch {
            await admin.from('otp_codes').update({ used_at: new Date().toISOString() }).eq('id', otpId)
            await audit(admin, 'otp_delivery_failed', userId, { ip: ipAddress, userAgent })
          }
        })
      }
    }
  } catch {
    // Keep account existence and internal service errors out of the response.
    await keepMinimumResponseTime(startedAt)
    return json(GENERIC)
  }

  await keepMinimumResponseTime(startedAt)
  return json(GENERIC)
}
