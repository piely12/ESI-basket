import { json } from '@/lib/security'
import { limitPublicApiRead } from '@/lib/security/public-api-rate-limit'
import { pushConfigStatus } from '@/lib/push/config'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/** Diagnostic : indique quelles clés de notification le serveur voit (jamais leurs valeurs). */
export async function GET(request: NextRequest) {
  const limited = await limitPublicApiRead(request)
  if (limited) return limited
  const status = pushConfigStatus()
  const canSubscribe = status.supabaseServiceRole
  const canSend = canSubscribe && status.privateKey && status.subject && status.cronSecret
  return json({ canSubscribe, canSend, ...status }, 200, { 'Cache-Control': 'no-store' })
}
