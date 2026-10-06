import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashOtp, safeEqualHex, signResetToken } from '@/lib/auth/otp'
import { normalizeEmail, isValidEmail } from '@/lib/validation'
import { json, assertSameOrigin, clientIp, rlKey, isLimited, recordHit } from '@/lib/security'

const INVALID = { error: 'Code invalide ou expiré.' }

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked

  const body = await request.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) return json(INVALID, 400)

  const admin = createAdminClient()

  // Limite par IP : 20 essais de code / 15 min, tous comptes confondus.
  const ipKey = rlKey('otp-ip', clientIp(request))
  if (await isLimited(admin, [{ key: ipKey, limit: 20 }], 15 * 60)) {
    return json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, 429, { 'Retry-After': '900' })
  }
  await recordHit(admin, [ipKey])

  const { data: userId } = await admin.rpc('user_id_by_email', { p_email: email })
  if (!userId) return json(INVALID, 400)

  const { data: otp } = await admin
    .from('otp_codes').select('*')
    .eq('user_id', userId).is('used_at', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (!otp || new Date(otp.expires_at) < new Date() || otp.attempts >= otp.max_attempts) {
    return json(INVALID, 400)
  }

  // La tentative est comptée AVANT la comparaison (anti-bruteforce).
  await admin.from('otp_codes').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)

  if (!safeEqualHex(otp.code_hash, hashOtp(userId, code))) {
    const left = otp.max_attempts - (otp.attempts + 1)
    return json({ error: left > 0 ? `Code incorrect. ${left} essai(s) restant(s).` : "Trop d'essais. Redemandez un code." }, 400)
  }
  return json({ ok: true, resetToken: signResetToken(otp.id, userId) })
}
