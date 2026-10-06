import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { json, assertSameOrigin, clientIp, clientUserAgent, audit } from '@/lib/security'

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (data.user) {
    const admin = createAdminClient()
    await admin.from('active_sessions').delete().eq('user_id', data.user.id)
    await audit(admin, 'logout', data.user.id, { ip: clientIp(request), userAgent: clientUserAgent(request) })
  }
  // 'local' : ferme uniquement CETTE session (pas les autres appareils du même compte).
  await supabase.auth.signOut({ scope: 'local' })
  return json({ ok: true })
}
