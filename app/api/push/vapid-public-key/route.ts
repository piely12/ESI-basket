import { json } from '@/lib/security'
import { limitPublicApiRead } from '@/lib/security/public-api-rate-limit'
import { vapidPublicKey } from '@/lib/push/config'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const limited = await limitPublicApiRead(request)
  if (limited) return limited
  return json({ publicKey: vapidPublicKey() }, 200, { 'Cache-Control': 'public, max-age=3600' })
}
