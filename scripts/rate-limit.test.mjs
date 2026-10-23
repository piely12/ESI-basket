import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createRateLimitKey,
  rateLimitedActionResult,
  runRateLimited,
} from '../lib/security/rate-limit-core.ts'
import { RATE_LIMITS } from '../lib/security/rate-limit-config.ts'

function createFakeAtomicLimiter(now = () => 0) {
  const events = new Map()
  return async ({ key, limit, windowSeconds }) => {
    const currentTime = now()
    const windowStart = currentTime - windowSeconds * 1000
    const active = (events.get(key) ?? []).filter((createdAt) => createdAt > windowStart)
    events.set(key, active)
    if (active.length >= limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((active[0] + windowSeconds * 1000 - currentTime) / 1000)) }
    }
    active.push(currentTime)
    events.set(key, active)
    return { allowed: true, retryAfterSeconds: 0 }
  }
}

test('renvoie RATE_LIMITED au plafond et ne lance aucune écriture', async () => {
  const consume = createFakeAtomicLimiter()
  const check = { key: 'mutation:user-a', limit: 2, windowSeconds: 60 }
  await runRateLimited([check], consume, async () => 'première écriture')
  await runRateLimited([check], consume, async () => 'deuxième écriture')

  let writes = 0
  const result = await runRateLimited([check], consume, async () => { writes += 1 })
  assert.deepEqual(result, { ok: false, retryAfterSeconds: 60 })
  assert.deepEqual(rateLimitedActionResult(result.retryAfterSeconds, 'Trop de modifications.'), {
    ok: false,
    code: 'RATE_LIMITED',
    message: 'Trop de modifications.',
    retryAfterSeconds: 60,
  })
  assert.equal(writes, 0)
})

test('autorise de nouveau après expiration de la fenêtre', async () => {
  let currentTime = 0
  const consume = createFakeAtomicLimiter(() => currentTime)
  const check = { key: 'contact:ip-a', limit: 1, windowSeconds: 60 }
  assert.equal((await runRateLimited([check], consume, async () => 'ok')).ok, true)
  assert.equal((await runRateLimited([check], consume, async () => 'écriture')).ok, false)
  currentTime = 60_001
  assert.deepEqual(await runRateLimited([check], consume, async () => 'écriture'), { ok: true, value: 'écriture' })
})

test('une IP à la limite ne bloque pas une autre IP', async () => {
  const consume = createFakeAtomicLimiter()
  const forIp = (ip) => ({ key: createRateLimitKey('public-api-read', ip), limit: 1, windowSeconds: 60 })
  assert.equal((await runRateLimited([forIp('192.0.2.10')], consume, async () => 'ok')).ok, true)
  assert.equal((await runRateLimited([forIp('192.0.2.10')], consume, async () => 'not written')).ok, false)
  assert.deepEqual(await runRateLimited([forIp('198.51.100.20')], consume, async () => 'allowed'), { ok: true, value: 'allowed' })
})

test('les quotas configurés correspondent aux valeurs demandées', () => {
  assert.equal(RATE_LIMITS.login.limit, 8)
  assert.equal(RATE_LIMITS.login.windowSeconds, 900)
  assert.equal(RATE_LIMITS.contact.limit, 3)
  assert.equal(RATE_LIMITS.contact.windowSeconds, 3600)
  assert.equal(RATE_LIMITS.invitation.limit, 20)
  assert.equal(RATE_LIMITS.invitation.windowSeconds, 60)
  assert.equal(RATE_LIMITS.sensitiveMutation.limit, 30)
  assert.equal(RATE_LIMITS.sensitiveMutation.windowSeconds, 60)
  assert.equal(RATE_LIMITS.publicApiRead.limit, 300)
  assert.equal(RATE_LIMITS.publicApiRead.windowSeconds, 60)
})
