import { createHash } from 'node:crypto'

export type RateLimitCheck = {
  key: string
  limit: number
  windowSeconds: number
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number }
export type ConsumeRateLimit = (check: RateLimitCheck) => Promise<RateLimitResult>
export type RateLimitedActionResult = { ok: false; code: 'RATE_LIMITED'; message: string; retryAfterSeconds: number }
export type ActionLimitFailure = RateLimitedActionResult | { ok: false; code: 'RATE_LIMIT_UNAVAILABLE'; message: string }

export function createRateLimitKey(...parts: string[]) {
  return createHash('sha256').update(parts.join('|')).digest('hex')
}

/** Applies all buckets, returning a denial if any bucket is exhausted. */
export async function consumeRateLimitChecks(checks: RateLimitCheck[], consume: ConsumeRateLimit): Promise<RateLimitResult> {
  const results = await Promise.all(checks.map(consume))
  const denied = results.filter((result) => !result.allowed)
  return denied.length
    ? { allowed: false, retryAfterSeconds: Math.max(...denied.map((result) => result.retryAfterSeconds)) }
    : { allowed: true, retryAfterSeconds: 0 }
}

export async function runRateLimited<T>(
  checks: RateLimitCheck[],
  consume: ConsumeRateLimit,
  operation: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; retryAfterSeconds: number }> {
  const limit = await consumeRateLimitChecks(checks, consume)
  if (!limit.allowed) return { ok: false, retryAfterSeconds: limit.retryAfterSeconds }
  return { ok: true, value: await operation() }
}

export function rateLimitedActionResult(retryAfterSeconds: number, message: string): RateLimitedActionResult {
  return { ok: false, code: 'RATE_LIMITED', message, retryAfterSeconds }
}
