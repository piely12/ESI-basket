import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    // Delete slightly before the 12-month limit to account for daily cron timing.
    const retentionCutoff = new Date(Date.now() - 330 * 24 * 60 * 60 * 1000).toISOString()
    const securityCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [{ count, error: messageError }, { error: limitError }] = await Promise.all([
      admin.from('contact_messages').delete({ count: 'exact' }).lt('created_at', retentionCutoff),
      admin.from('rate_limits').delete().lt('created_at', securityCutoff),
    ])
    if (messageError) throw messageError
    if (limitError) throw limitError
    return Response.json({ ok: true, deletedMessages: count ?? 0 })
  } catch (error) {
    console.error('[privacy-retention] Cleanup failed', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'unavailable' }, { status: 500 })
  }
}
