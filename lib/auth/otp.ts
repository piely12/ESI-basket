import 'server-only'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

export const OTP_TTL_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
export const OTP_MAX_PER_WINDOW = 3          // codes demandés...
export const OTP_WINDOW_MINUTES = 15         // ...par fenêtre de 15 min
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000

function pepper(): string {
  const p = process.env.OTP_PEPPER
  if (!p || p.length < 16) throw new Error('OTP_PEPPER manquant ou trop court dans .env.local')
  return p
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashOtp(userId: string, code: string): string {
  return createHmac('sha256', pepper()).update(`otp:${userId}:${code}`).digest('hex')
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

// Jeton signé remis après un code valide : autorise UN changement de mot de passe.
export function signResetToken(otpId: string, userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ o: otpId, u: userId, e: Date.now() + RESET_TOKEN_TTL_MS })
  ).toString('base64url')
  const sig = createHmac('sha256', pepper()).update(`reset:${payload}`).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyResetToken(token: string): { otpId: string; userId: string } | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = createHmac('sha256', pepper()).update(`reset:${payload}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const { o, u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof o !== 'string' || typeof u !== 'string' || typeof e !== 'number') return null
    if (Date.now() > e) return null
    return { otpId: o, userId: u }
  } catch {
    return null
  }
}
