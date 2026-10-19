import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserProfile, HOME_SITE, isSingleSessionRole } from '@/lib/auth/roles'
import { hashFirstLoginOtp, safeEqualHex } from '@/lib/auth/otp'
import { assertSameOrigin, audit, clientIp, clientUserAgent, isLimited, json, recordHit, rlKey } from '@/lib/security'
import { validateNewPassword } from '@/lib/validation'

const invalidCode = 'Code invalide ou expiré.'
const inputSchema = z.object({
  otp: z.string().regex(/^\d{6}$/),
  password: z.string().min(1).max(256),
  confirmation: z.string().min(1).max(256),
}).strict()

function sessionIdFromJwt(jwt: string): string | null {
  try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).session_id ?? null }
  catch { return null }
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked
  const body = await request.json().catch(() => null)
  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) return json({ error: invalidCode }, 400)
  const { otp, password, confirmation } = parsed.data
  if (confirmation !== password) return json({ error: 'Les mots de passe ne correspondent pas.' }, 400)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: invalidCode }, 401)
  const [profile, access] = await Promise.all([
    getCurrentUserProfile(supabase).catch(() => null),
    supabase.rpc('current_user_access_state'),
  ])
  const state = access.data as { is_active?: boolean; must_change_password?: boolean } | null
  if (access.error || !profile || !state || state.is_active !== true || state.must_change_password !== true) {
    return json({ error: invalidCode }, 401)
  }
  const passwordError = validateNewPassword(password, user.email ?? undefined, `${profile.first_name} ${profile.last_name}`)
  if (passwordError) return json({ error: passwordError }, 400)

  const admin = createAdminClient()
  const ip = clientIp(request)
  const userAgent = clientUserAgent(request)
  const ipKey = rlKey('first-login-otp-ip', ip)
  if (await isLimited(admin, [{ key: ipKey, limit: 20 }], 15 * 60)) {
    return json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429, { 'Retry-After': '900' })
  }
  await recordHit(admin, [ipKey])

  const { data: rows, error: consumeError } = await admin.rpc('consume_first_login_otp', { p_user_id: user.id })
  const attempt = rows?.[0]
  if (consumeError || !attempt) return json({ error: invalidCode }, 400)
  const expectedHash = hashFirstLoginOtp(user.id, otp)
  if (!safeEqualHex(attempt.code_hash, expectedHash)) return json({ error: invalidCode }, 400)

  const { data: consumed, error: finishError } = await admin.rpc('finish_first_login_otp', {
    p_otp_id: attempt.otp_id,
    p_user_id: user.id,
  })
  if (finishError || consumed !== true) return json({ error: invalidCode }, 400)

  const { error: updatePasswordError } = await admin.auth.admin.updateUserById(user.id, { password })
  if (updatePasswordError) return json({ error: 'Connexion impossible. Redemandez un code et réessayez.' }, 503)
  const changedAt = new Date().toISOString()
  const { error: stateError } = await admin.from('users').update({
    must_change_password: false,
    password_changed_at: changedAt,
  }).eq('id', user.id)
  if (stateError) return json({ error: 'Connexion impossible. Contactez le coach.' }, 503)

  const { data: { session } } = await supabase.auth.getSession()
  if (isSingleSessionRole(profile.role) && session) {
    const sessionId = sessionIdFromJwt(session.access_token)
    if (sessionId) {
      await admin.auth.admin.signOut(session.access_token, 'others')
      await admin.from('active_sessions').upsert({ user_id: user.id, current_session_id: sessionId, updated_at: changedAt })
    }
  }
  await audit(admin, 'first_login_password_changed', user.id, { ip, userAgent, metadata: { role: profile.role } })
  return json({ ok: true, redirect: `/${HOME_SITE[profile.role]}` })
}
