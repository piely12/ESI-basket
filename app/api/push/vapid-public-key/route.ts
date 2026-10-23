import { json } from '@/lib/security'
import { limitPublicApiRead } from '@/lib/security/public-api-rate-limit'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const limited = await limitPublicApiRead(request)
  if (limited) return limited
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) return json({ error: 'unavailable' }, 503)
  return json({ publicKey }, 200, { 'Cache-Control': 'public, max-age=3600' })
}
