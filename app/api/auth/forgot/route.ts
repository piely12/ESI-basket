import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateOtp, hashOtp, OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_WINDOW, OTP_WINDOW_MINUTES,
} from '@/lib/auth/otp'
import { sendOtpEmail } from '@/lib/auth/brevo'
import { normalizeEmail, isValidEmail } from '@/lib/validation'
import { json, assertSameOrigin, clientIp, clientUserAgent, rlKey, isLimited, recordHit, audit } from '@/lib/security'

// Réponse identique que l'e-mail existe ou non : on ne révèle pas qui a un compte.
const GENERIC = { ok: true, message: "Si un compte existe pour cet e-mail, un code vient d'être envoyé." }

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked

  const body = await request.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  if (!isValidEmail(email)) return json({ error: 'E-mail invalide.' }, 400)

  try {
    const admin = createAdminClient()

    // Limite par IP : 10 demandes / 15 min (empêche d'arroser des comptes d'e-mails).
    const ipKey = rlKey('forgot-ip', clientIp(request))
    if (await isLimited(admin, [{ key: ipKey, limit: 10 }], OTP_WINDOW_MINUTES * 60)) {
      return json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' }, 429,
        { 'Retry-After': String(OTP_WINDOW_MINUTES * 60) })
    }
    await recordHit(admin, [ipKey])

    const { data: userId } = await admin.rpc('user_id_by_email', { p_email: email })
    if (!userId) return json(GENERIC)

    // Limite par compte : 3 codes / 15 min.
    const since = new Date(Date.now() - OTP_WINDOW_MINUTES * 60_000).toISOString()
    const { count } = await admin
      .from('otp_codes').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', since)
    if ((count ?? 0) >= OTP_MAX_PER_WINDOW) return json(GENERIC)

    // Un seul code valide à la fois : on invalide les précédents.
    await admin.from('otp_codes').update({ used_at: new Date().toISOString() })
      .eq('user_id', userId).is('used_at', null)

    const code = generateOtp()
    await admin.from('otp_codes').insert({
      user_id: userId,
      code_hash: hashOtp(userId, code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
      max_attempts: OTP_MAX_ATTEMPTS,
    })
    await sendOtpEmail(email, code, OTP_TTL_MINUTES)
    await audit(admin, 'otp_requested', userId, { ip: clientIp(request), userAgent: clientUserAgent(request) })
  } catch (e) {
    console.error('[forgot]', e)
    return json({ error: "Impossible d'envoyer le code pour le moment." }, 500)
  }
  return json(GENERIC)
}
