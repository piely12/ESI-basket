import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyResetToken } from '@/lib/auth/otp'
import { validateNewPassword } from '@/lib/validation'
import { json, assertSameOrigin, clientIp, clientUserAgent, audit } from '@/lib/security'

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked

  const body = await request.json().catch(() => null)
  const token = typeof body?.resetToken === 'string' ? body.resetToken : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const parsed = verifyResetToken(token)
  if (!parsed) return json({ error: 'Session expirée. Recommencez.' }, 400)

  const admin = createAdminClient()
  const { data: u } = await admin.auth.admin.getUserById(parsed.userId)
  const pwError = validateNewPassword(password, u?.user?.email ?? undefined)
  if (pwError) return json({ error: pwError }, 400)

  // Le code doit encore être inutilisé : le jeton ne sert qu'une fois.
  const { data: consumed } = await admin
    .from('otp_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', parsed.otpId).eq('user_id', parsed.userId).is('used_at', null)
    .select('id')
  if (!consumed || consumed.length === 0) return json({ error: 'Session expirée. Recommencez.' }, 400)

  const { error } = await admin.auth.admin.updateUserById(parsed.userId, { password })
  if (error) return json({ error: 'Impossible de changer le mot de passe.' }, 500)

  await admin.from('active_sessions').delete().eq('user_id', parsed.userId)
  await audit(admin, 'password_reset', parsed.userId, { ip: clientIp(request), userAgent: clientUserAgent(request) })
  return json({ ok: true })
}
