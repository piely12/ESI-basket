import { after, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserProfile, HOME_SITE, isSingleSessionRole } from '@/lib/auth/roles'
import { sendAdminLoginAlert, sendFirstLoginOtpEmail } from '@/lib/auth/brevo'
import { generateOtp, hashFirstLoginOtp, OTP_TTL_MINUTES } from '@/lib/auth/otp'
import {
  json, assertSameOrigin, clientIp, clientUserAgent, rlKey,
  isLimited, consumeRateLimits, recordHit, clearHits, checkProgressiveLockout, audit,
} from '@/lib/security'
import { RATE_LIMITS } from '@/lib/security/rate-limit-config'

const WINDOW_SEC = RATE_LIMITS.login.windowSeconds
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strict()

async function findAdminActorId(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { data: userId } = await admin.rpc('user_id_by_email', { p_email: email })
  if (!userId) return null
  const { data } = await admin.from('staff').select('user_id').eq('user_id', userId).eq('role', 'admin').maybeSingle()
  return data?.user_id ?? null
}

function sessionIdFromJwt(jwt: string): string | null {
  try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).session_id ?? null }
  catch { return null }
}

async function sendAdminAlertLater(email: string, userId: string, ip: string, userAgent: string) {
  const admin = createAdminClient()
  try {
    await sendAdminLoginAlert(email, { ip, userAgent })
    await audit(admin, 'admin_login_alert_sent', userId, { ip, userAgent })
  } catch {
    await audit(admin, 'admin_login_alert_failed', userId, { ip, userAgent })
  }
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > 2048) return json({ error: 'Identifiants incorrects.' }, 413)
  let body: unknown = null
  try {
    const reader = request.body?.getReader()
    if (!reader) return json({ error: 'Identifiants incorrects.' }, 400)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 2048) {
        await reader.cancel()
        return json({ error: 'Identifiants incorrects.' }, 413)
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    body = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return json({ error: 'Identifiants incorrects.' }, 400)
  }
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Identifiants incorrects.' }, 401)
  const { email, password } = parsed.data

  const admin = createAdminClient()
  const ip = clientIp(request)
  const userAgent = clientUserAgent(request)
  const pairKey = rlKey('login', email, ip)
  const ipKey = rlKey('login-ip', ip)

  const lockout: { blocked: boolean; failedAttempts: number; retryAfterSec: number } = { blocked: false, failedAttempts: 0, retryAfterSec: 0 }
  if (lockout.blocked) {
    after(async () => {
      const actorId = await findAdminActorId(admin, email)
      if (actorId) await audit(admin, 'admin_login_blocked', actorId, { ip, userAgent, metadata: { failed_attempts: lockout.failedAttempts } })
    })
    return json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429, { 'Retry-After': String(lockout.retryAfterSec) })
  }
  let ipLimit: { allowed: boolean; retryAfterSeconds: number }
  try {
    ipLimit = await consumeRateLimits(admin, [
      { key: ipKey, limit: RATE_LIMITS.login.limit, windowSeconds: WINDOW_SEC },
      { key: rlKey('login-email', email), limit: RATE_LIMITS.login.limit, windowSeconds: WINDOW_SEC },
    ])
  } catch {
    return json({ error: 'Connexion temporairement indisponible.' }, 503)
  }
  if (!ipLimit.allowed) {
    after(async () => {
      const actorId = await findAdminActorId(admin, email)
      if (actorId) await audit(admin, 'admin_login_ip_rate_limited', actorId, { ip, userAgent })
    })
    return json({ error: RATE_LIMITS.login.message }, 429, { 'Retry-After': String(ipLimit.retryAfterSeconds) })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    await recordHit(admin, [pairKey])
    const failed = await checkProgressiveLockout(admin, pairKey, WINDOW_SEC)
    await audit(admin, 'login_failed', null, { ip, userAgent, metadata: { attempt_fingerprint: pairKey } })
    after(async () => {
      const actorId = await findAdminActorId(admin, email)
      if (!actorId) return
      await audit(admin, 'admin_login_failed', actorId, { ip, userAgent, metadata: { failed_attempts: failed.failedAttempts } })
      if (failed.failedAttempts >= 5) await audit(admin, 'admin_login_repeated_failures', actorId, { ip, userAgent, metadata: { failed_attempts: failed.failedAttempts } })
    })
    return json({ error: 'Identifiants incorrects.' }, 401)
  }

  let profile
  let accessState: { is_active?: boolean; must_change_password?: boolean } | null
  try {
    profile = await getCurrentUserProfile(supabase)
    const access = await supabase.rpc('current_user_access_state')
    if (access.error) throw new Error('account state unavailable')
    accessState = access.data as typeof accessState
  } catch {
    await supabase.auth.signOut({ scope: 'local' })
    return json({ error: 'Identifiants incorrects.' }, 401)
  }

  const role = profile?.role ?? null
  if (!role || !accessState || accessState.is_active !== true) {
    await supabase.auth.signOut({ scope: 'local' })
    await audit(admin, 'login_denied_inactive_or_unlinked', data.user.id, { ip, userAgent })
    return json({ error: 'Identifiants incorrects.' }, 401)
  }

  // Enforce the existing single-session rule only after the identity and the
  // role have been verified from Supabase.
  if (isSingleSessionRole(role)) {
    const sessionId = sessionIdFromJwt(data.session.access_token)
    if (sessionId) {
      await admin.auth.admin.signOut(data.session.access_token, 'others')
      await admin.from('active_sessions').upsert({ user_id: data.user.id, current_session_id: sessionId, updated_at: new Date().toISOString() })
    }
  }

  await clearHits(admin, pairKey)
  if (role === 'admin') {
    await audit(admin, 'admin_login_success', data.user.id, { ip, userAgent, metadata: { first_login: !!accessState.must_change_password } })
    if (data.user.email) after(() => sendAdminAlertLater(data.user.email!, data.user.id, ip, userAgent))
  }

  if (accessState.must_change_password) {
    const sendKey = rlKey('first-login-otp-send', data.user.id, ip)
    if (await isLimited(admin, [{ key: sendKey, limit: 3 }], WINDOW_SEC)) {
      await supabase.auth.signOut({ scope: 'local' })
      return json({ error: 'Trop de demandes de code. Réessayez dans 15 minutes.' }, 429, { 'Retry-After': String(WINDOW_SEC) })
    }
    const code = generateOtp()
    let codeHash: string
    try { codeHash = hashFirstLoginOtp(data.user.id, code) }
    catch {
      await supabase.auth.signOut({ scope: 'local' })
      return json({ error: 'Connexion impossible. Réessayez.' }, 503)
    }
    const { error: issueError } = await admin.rpc('issue_first_login_otp', {
      p_user_id: data.user.id,
      p_code_hash: codeHash,
      p_expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    })
    if (issueError || !data.user.email) {
      await supabase.auth.signOut({ scope: 'local' })
      return json({ error: 'Connexion impossible. Réessayez.' }, 503)
    }
    await recordHit(admin, [sendKey])
    const targetEmail = data.user.email
    after(async () => {
      try {
        await sendFirstLoginOtpEmail(targetEmail, code, OTP_TTL_MINUTES)
        await audit(admin, 'first_login_otp_sent', data.user.id, { ip, userAgent })
      } catch {
        await audit(admin, 'first_login_otp_delivery_failed', data.user.id, { ip, userAgent })
      }
    })
    return json({ ok: true, redirect: '/premiere-connexion' })
  }

  await audit(admin, 'login_success', data.user.id, { ip, userAgent, metadata: { role } })
  return json({ ok: true, redirect: `/${HOME_SITE[role]}` })
}
