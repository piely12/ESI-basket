import { NextResponse, type NextRequest } from 'next/server'
import { limitPublicApiRead } from '@/lib/security/public-api-rate-limit'

// Lightweight process liveness check; it does not expose configuration or
// make a database request on every monitor poll.
export async function GET(request: NextRequest) {
  const limited = await limitPublicApiRead(request)
  if (limited) return limited
  return NextResponse.json(
    { status: 'ok' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
