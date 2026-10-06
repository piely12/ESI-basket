import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserProfile, HOME_SITE, isSingleSessionRole, type CurrentUserProfile } from '@/lib/auth/roles'
import { getSiteFromHost } from '@/lib/sites'
import { siteUrl } from '@/lib/auth/hosts'
import { normalizeEmail, isValidEmail, PASSWORD_MAX } from '@/lib/validation'
import {
  json, assertSameOrigin, clientIp, clientUserAgent, rlKey,
  isLimited, recordHit, clearHits, checkProgressiveLockout, audit,
} from '@/lib/security'

const WINDOW_SEC = 15 * 60

function sessionIdFromJwt(jwt: string): string | null {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).session_id ?? null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  const logStep = (step: string) => console.info(`[login] ${step} (${Date.now() - startedAt} ms)`)
  logStep('requête reçue')
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked

  const body = await request.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!isValidEmail(email) || password.length === 0 || password.length > PASSWORD_MAX) {
    return json({ error: 'E-mail ou mot de passe invalide.' }, 400)
  }

  const admin = createAdminClient()
  const ip = clientIp(request)
  const userAgent = clientUserAgent(request)
  const pairKey = rlKey('login', email, ip)   // compte + IP : verrouillage progressif
  const ipKey = rlKey('login-ip', ip)         // IP seule : 20 échecs / 15 min, tous comptes confondus

  // RB-LOGIN-004 : délai croissant après 5 échecs, blocage total après 10.
  const lockout = await checkProgressiveLockout(admin, pairKey, WINDOW_SEC)
  if (lockout.blocked) {
    return json(
      { error: `Trop de tentatives. Réessayez dans ${lockout.retryAfterSec}s.` },
      429, { 'Retry-After': String(lockout.retryAfterSec) }
    )
  }
  if (await isLimited(admin, [{ key: ipKey, limit: 20 }], WINDOW_SEC)) {
    return json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, 429, { 'Retry-After': String(WINDOW_SEC) })
  }
  logStep('contrôle anti-tentatives terminé')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  logStep('authentification Supabase terminée')
  if (error || !data.session || !data.user) {
    await recordHit(admin, [pairKey, ipKey])
    await audit(admin, 'login_failed', null, { ip, userAgent, metadata: { email_attempted: email } })
    // Message volontairement identique pour « compte inconnu » et « mauvais mot de passe ».
    return json({ error: 'Identifiants incorrects.' }, 401)
  }

  let profile: CurrentUserProfile | null
  try {
    // Read the profile through the authenticated user's JWT and the narrowly
    // scoped current_user_profile() RPC, not through browser table grants.
    profile = await getCurrentUserProfile(supabase)
    logStep('lecture du profil terminée')
  } catch (profileError) {
    console.error('[login] profile lookup failed', profileError)
    await supabase.auth.signOut({ scope: 'local' })
    return json({ error: 'Connexion établie, mais la vérification du profil a échoué. Vérifiez la configuration Supabase ou contactez l’administrateur.' }, 503)
  }

  const role = profile?.role ?? null
  if (!role) {
    await supabase.auth.signOut({ scope: 'local' })
    await audit(admin, 'login_denied_no_profile', data.user.id, { ip, userAgent })
    return json({ error: "Ce compte n'est rattaché à aucun joueur ni poste. Contactez le coach." }, 403)
  }

  // RB-AUTH-001 : une seule session active pour le coach / coach adjoint / admin.
  if (isSingleSessionRole(role)) {
    const sessionId = sessionIdFromJwt(data.session.access_token)
    if (sessionId) {
      await admin.auth.admin.signOut(data.session.access_token, 'others')
      await admin
        .from('active_sessions')
        .upsert({ user_id: data.user.id, current_session_id: sessionId, updated_at: new Date().toISOString() })
    }
  }
  logStep('gestion de session terminée')

  await clearHits(admin, pairKey)
  await audit(admin, 'login_success', data.user.id, { ip, userAgent, metadata: { role } })
  logStep('journalisation terminée')

  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const target = HOME_SITE[role]
  const hostname = host.split(':')[0].toLowerCase()
  const isLocalHost = hostname === 'localhost' || hostname.endsWith('.localhost')
  // In local development, keep navigation on the same host so the host-only
  // Supabase cookie remains available. The proxy maps /coach, /stats, etc.
  // to the corresponding private app routes.
  const redirectTo = getSiteFromHost(host) === target
    ? '/'
    : isLocalHost
      ? `${proto}://${host}/${target}`
      : siteUrl(host, target, proto)
  return json({ ok: true, role, redirectTo })
}
