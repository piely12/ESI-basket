import type { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientIp, consumeRateLimit, json, rlKey } from '@/lib/security'
import { RATE_LIMITS } from '@/lib/security/rate-limit-config'

/** Public reads fail open if the shared limiter is unavailable. */
export async function limitPublicApiRead(request: NextRequest): Promise<NextResponse | null> {
  try {
    const limit = await consumeRateLimit(
      createAdminClient(),
      rlKey('public-api-read', clientIp(request)),
      RATE_LIMITS.publicApiRead.limit,
      RATE_LIMITS.publicApiRead.windowSeconds,
    )
    if (!limit.allowed) return json({ error: RATE_LIMITS.publicApiRead.message }, 429, { 'Retry-After': String(limit.retryAfterSeconds) })
  } catch {
    // Read-only endpoints stay available if Supabase's limiter is unavailable.
  }
  return null
}
