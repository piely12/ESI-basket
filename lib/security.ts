import 'server-only'
import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Réponse JSON qui ne doit jamais être mise en cache (données d'authentification).
export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

// Protection CSRF : une requête d'écriture doit venir de la MÊME origine que l'hôte servi.
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const host = request.headers.get('host')
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).host === host) return null
    } catch { /* origine illisible -> refus */ }
    return json({ error: 'Requête refusée.' }, 403)
  }
  if (request.headers.get('sec-fetch-site') === 'same-origin') return null
  return json({ error: 'Requête refusée.' }, 403)
}

export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown'
}

export function clientUserAgent(request: NextRequest): string {
  return (request.headers.get('user-agent') || 'inconnu').slice(0, 300)
}

// Les clés de limitation sont hachées : aucune adresse e-mail n'est stockée en clair.
export function rlKey(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex')
}

type Rule = { key: string; limit: number }

export async function isLimited(admin: SupabaseClient, rules: Rule[], windowSec: number): Promise<boolean> {
  const since = new Date(Date.now() - windowSec * 1000).toISOString()
  for (const r of rules) {
    const { count, error } = await admin
      .from('rate_limits').select('id', { count: 'exact', head: true })
      .eq('key', r.key).gte('created_at', since)
    if (error) { console.error('[rate-limit] table indisponible (003_security.sql exécuté ?)', error.message); return false }
    if ((count ?? 0) >= r.limit) return true
  }
  return false
}

export async function recordHit(admin: SupabaseClient, keys: string[]) {
  const { error } = await admin.from('rate_limits').insert(keys.map((key) => ({ key })))
  if (error) console.error('[rate-limit] enregistrement impossible', error.message)
  if (Math.random() < 0.02) {
    await admin.from('rate_limits').delete().lt('created_at', new Date(Date.now() - 86_400_000).toISOString())
  }
}

export async function clearHits(admin: SupabaseClient, key: string) {
  await admin.from('rate_limits').delete().eq('key', key)
}

// ---------------------------------------------------------------------
// Verrouillage progressif (RB-LOGIN-004) :
//  - moins de 5 échecs dans la fenêtre : rien de spécial.
//  - 5 à 9 échecs : un délai minimum croissant doit s'être écoulé depuis
//    le dernier échec (2s, 4s, 8s, 16s, 32s) avant d'accepter un nouvel essai.
//  - 10 échecs ou plus : blocage complet pendant le reste de la fenêtre (15 min).
// ---------------------------------------------------------------------
const PROGRESSIVE_THRESHOLD = 5
const HARD_BLOCK_THRESHOLD = 10
const PROGRESSIVE_DELAYS_SEC = [2, 4, 8, 16, 32] // pour le 5e, 6e, 7e, 8e, 9e échec

export type LockoutState = { blocked: false } | { blocked: true; retryAfterSec: number }

export async function checkProgressiveLockout(
  admin: SupabaseClient, key: string, windowSec: number
): Promise<LockoutState> {
  const since = new Date(Date.now() - windowSec * 1000).toISOString()
  const { data, error } = await admin
    .from('rate_limits').select('created_at')
    .eq('key', key).gte('created_at', since)
    .order('created_at', { ascending: false })
  if (error || !data) return { blocked: false }

  const count = data.length
  if (count >= HARD_BLOCK_THRESHOLD) {
    const oldest = new Date(data[data.length - 1].created_at).getTime()
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowSec * 1000 - Date.now()) / 1000))
    return { blocked: true, retryAfterSec }
  }
  if (count >= PROGRESSIVE_THRESHOLD) {
    const requiredDelay = PROGRESSIVE_DELAYS_SEC[Math.min(count - PROGRESSIVE_THRESHOLD, PROGRESSIVE_DELAYS_SEC.length - 1)]
    const lastAt = new Date(data[0].created_at).getTime()
    const elapsed = (Date.now() - lastAt) / 1000
    if (elapsed < requiredDelay) {
      return { blocked: true, retryAfterSec: Math.ceil(requiredDelay - elapsed) }
    }
  }
  return { blocked: false }
}

// Journal d'audit (§8 du cahier des charges). Ne jamais y mettre de mot de passe ni de code.
export async function audit(
  admin: SupabaseClient,
  action: string,
  userId: string | null,
  opts: { ip?: string; userAgent?: string; metadata?: Record<string, unknown> } = {}
) {
  const { error } = await admin.from('audit_logs').insert({
    actor_user_id: userId,
    action,
    entity_type: 'auth',
    ip_address: opts.ip ?? null,
    user_agent: opts.userAgent ?? null,
    metadata: opts.metadata ?? {},
  })
  if (error) console.error('[audit]', error.message)
}
