import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { consumeRateLimit, rlKey } from '@/lib/security'
import { RATE_LIMITS } from '@/lib/security/rate-limit-config'
import { rateLimitedActionResult, type ActionLimitFailure } from '@/lib/security/rate-limit-core'

export type ActionLimitKind = 'invitation' | 'sensitiveMutation'

export async function checkConnectedActionLimit(userId: string, kind: ActionLimitKind): Promise<{ ok: true } | ActionLimitFailure> {
  const policy = RATE_LIMITS[kind]
  const key = kind === 'invitation' ? 'connected-invitation' : 'connected-sensitive-mutation'
  try {
    const result = await consumeRateLimit(createAdminClient(), rlKey(key, userId), policy.limit, policy.windowSeconds)
    if (!result.allowed) return rateLimitedActionResult(result.retryAfterSeconds, policy.message)
    return { ok: true }
  } catch {
    return { ok: false, code: 'RATE_LIMIT_UNAVAILABLE', message: 'Le service de sécurité est indisponible. Réessaie plus tard.' }
  }
}
