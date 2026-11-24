import { json } from '@/lib/security'
import { limitPublicApiRead } from '@/lib/security/public-api-rate-limit'
import { pushConfigStatus } from '@/lib/push/config'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/** Checks that the subscriptions table is reachable; returns an error code otherwise. */
async function subscriptionsTable() {
  try {
    const { error } = await createAdminClient().from('match_reminder_subscriptions').select('id', { head: true, count: 'exact' })
    return error ? (error.code || 'database') : 'ok'
  } catch {
    return 'config'
  }
}

/** Diagnostic : indique quelles clés de notification le serveur voit (jamais leurs valeurs). */
export async function GET(request: NextRequest) {
  const limited = await limitPublicApiRead(request)
  if (limited) return limited
  const status = pushConfigStatus()
  const table = await subscriptionsTable()
  const canSubscribe = table === 'ok'
  const canSend = canSubscribe && status.privateKey && status.subject && status.cronSecret
  return json({ canSubscribe, canSend, subscriptionsTable: table, ...status }, 200, { 'Cache-Control': 'no-store' })
}
