import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import { assertSameOrigin, consumeRateLimit, json, rlKey } from '@/lib/security'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const Nickname = z.object({
  nickname: z.string().trim().max(20).refine(
    (value) => value === '' || (value.length >= 2 && /^[\p{L}\p{N} ._'’-]+$/u.test(value)),
  ),
}).strict()

/** Signed-in, active account linked to a profile, or null. */
async function currentAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [profile, access] = await Promise.all([
    getCurrentUserProfile(supabase).catch(() => null),
    supabase.rpc('current_user_access_state'),
  ])
  const state = access.data as { is_active?: boolean; must_change_password?: boolean } | null
  if (!profile || access.error || state?.is_active !== true || state.must_change_password) return null
  return { user, profile }
}

type MatchRow = {
  id: string
  scheduled_at: string
  kickoff_confirmed: boolean | null
  location: string | null
  status: string
  home_team_id: string
  home: { name: string } | { name: string }[] | null
  away: { name: string } | { name: string }[] | null
}

/** The player's next published call-up (match not finished). */
async function nextConvocation(admin: ReturnType<typeof createAdminClient>, playerId: string, teamId: string | null) {
  const { data: rosters } = await admin.from('match_rosters').select('match_id')
    .eq('player_id', playerId).eq('is_called_up', true)
  const ids = (rosters ?? []).map((row) => row.match_id)
  if (!ids.length) return null
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { data } = await admin.from('matches')
    .select('id,scheduled_at,kickoff_confirmed,location,status,home_team_id,home:teams!matches_home_team_id_fkey(name),away:teams!matches_away_team_id_fkey(name)')
    .in('id', ids).neq('status', 'termine').gte('scheduled_at', since)
    .order('scheduled_at', { ascending: true }).limit(1)
  const match = (data?.[0] ?? null) as MatchRow | null
  if (!match) return null
  const name = (team: MatchRow['home']) => (Array.isArray(team) ? team[0]?.name : team?.name) ?? null
  return {
    matchId: match.id,
    scheduledAt: match.scheduled_at,
    kickoffConfirmed: match.kickoff_confirmed !== false,
    location: match.location,
    opponent: match.home_team_id === teamId ? name(match.away) : name(match.home),
  }
}

export async function GET() {
  const account = await currentAccount().catch(() => null)
  if (!account) return json({ authenticated: false }, 200, NO_STORE)
  const { user, profile } = account
  const admin = createAdminClient()
  const [{ data: row }, convocation] = await Promise.all([
    admin.from('users').select('nickname').eq('id', user.id).maybeSingle(),
    profile.role === 'joueur' ? nextConvocation(admin, profile.person_id, profile.team_id).catch(() => null) : Promise.resolve(null),
  ])
  return json({
    authenticated: true,
    role: profile.role,
    firstName: profile.first_name,
    lastName: profile.last_name,
    nickname: (row as { nickname?: string | null } | null)?.nickname ?? null,
    convocation,
  }, 200, NO_STORE)
}

export async function PATCH(request: NextRequest) {
  const blocked = assertSameOrigin(request)
  if (blocked) return blocked
  const parsed = Nickname.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Pseudo invalide : 2 à 20 lettres, chiffres, espaces ou . _ - \'' }, 400, NO_STORE)

  const account = await currentAccount().catch(() => null)
  if (!account) return json({ error: 'Session expirée. Reconnecte-toi.' }, 401, NO_STORE)
  const admin = createAdminClient()
  const limit = await consumeRateLimit(admin, rlKey('nickname', account.user.id), 20, 60 * 60).catch(() => ({ allowed: true }))
  if (!limit.allowed) return json({ error: 'Trop de changements. Réessaie dans une heure.' }, 429, NO_STORE)

  const nickname = parsed.data.nickname || null
  const { error } = await admin.from('users').update({ nickname }).eq('id', account.user.id)
  if (error) return json({ error: 'Enregistrement impossible pour le moment.' }, 503, NO_STORE)
  return json({ ok: true, nickname }, 200, NO_STORE)
}
