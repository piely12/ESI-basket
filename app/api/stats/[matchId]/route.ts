import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import { manualStatsActionSchema } from '@/lib/stats/manual-schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function authorize(request: Request) {
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  if (origin ? origin !== new URL(request.url).origin : fetchSite !== 'same-origin') return { response: json(403, { error: 'forbidden' }) }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: json(401, { error: 'unauthorized' }) }
  const [{ data: state, error: stateError }, profile] = await Promise.all([
    supabase.rpc('current_user_access_state'), getCurrentUserProfile(supabase).catch(() => null),
  ])
  const access = state as { is_active?: boolean; must_change_password?: boolean } | null
  if (stateError || access?.is_active !== true || access.must_change_password !== false || !profile) return { response: json(401, { error: 'unauthorized' }) }
  if (profile.role !== 'statisticienne' || !profile.team_id) return { response: json(403, { error: 'forbidden' }) }
  return { user, profile }
}

export async function PATCH(request: Request, context: RouteContext<'/api/stats/[matchId]'>) {
  return handle(request, context.params, true)
}

export async function POST(request: Request, context: RouteContext<'/api/stats/[matchId]'>) {
  return handle(request, context.params, false)
}

async function handle(request: Request, params: Promise<{ matchId: string }>, patchOnly: boolean) {
  const auth = await authorize(request)
  if ('response' in auth) return auth.response
  const { matchId } = await params
  if (!UUID.test(matchId)) return json(400, { error: 'invalid' })
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > 64 * 1024) return json(413, { error: 'too_large' })
  let payload: unknown
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > 64 * 1024) return json(413, { error: 'too_large' })
    payload = JSON.parse(raw)
  } catch { return json(400, { error: 'invalid' }) }
  const parsed = manualStatsActionSchema.safeParse(payload)
  if (!parsed.success || (patchOnly && parsed.data.action !== 'save') || (!patchOnly && parsed.data.action === 'save')) {
    return json(400, { error: 'invalid', fieldErrors: parsed.success ? undefined : parsed.error.flatten().fieldErrors })
  }
  const admin = createAdminClient()
  const { data: match, error: matchError } = await admin.from('matches')
    .select('id,status,home_team_id,away_team_id').eq('id', matchId).maybeSingle()
  if (matchError || !match) return json(404, { error: 'not_found' })
  const teamId = auth.profile.team_id
  if (![match.home_team_id, match.away_team_id].includes(teamId)) return json(403, { error: 'forbidden' })
  if (match.status !== 'termine') return json(409, { error: 'match_not_finished' })

  let result: { data: unknown; error: { message: string } | null }
  const body = parsed.data
  if (body.action === 'save') {
    if ((body.esi_score === null) !== (body.opponent_score === null)) return json(400, { error: 'score_required' })
    const { data: called, error: rosterError } = await admin.from('match_rosters')
      .select('player_id').eq('match_id', matchId).eq('is_called_up', true)
    if (rosterError) return json(500, { error: 'save_failed' })
    const { data: esiPlayers, error: playersError } = await admin.from('players').select('id')
      .eq('team_id', teamId).in('id', (called ?? []).map((row) => row.player_id))
    if (playersError) return json(500, { error: 'save_failed' })
    const rosterIds = (esiPlayers ?? []).map((player) => player.id).sort()
    const submittedIds = body.players.map((player) => player.player_id).sort()
    if (!rosterIds.length || new Set(submittedIds).size !== submittedIds.length
      || rosterIds.length !== submittedIds.length || rosterIds.some((id, index) => id !== submittedIds[index])) {
      return json(409, { error: 'roster_changed' })
    }
    const homeIsEsi = match.home_team_id === teamId
    result = await admin.rpc('save_esi_match_stats_manual', {
      p_match_id: matchId, p_actor_id: auth.user.id,
      p_home_score: homeIsEsi ? body.esi_score : body.opponent_score,
      p_away_score: homeIsEsi ? body.opponent_score : body.esi_score,
      p_team_stats: body.team,
      p_player_stats: body.players,
    })
  } else if (body.action === 'prepare-review') {
    result = await admin.rpc('prepare_esi_match_stats_review', { p_match_id: matchId, p_actor_id: auth.user.id })
  } else if (body.action === 'validate-review') {
    result = await admin.rpc('validate_esi_match_stats_review', {
      p_match_id: matchId, p_actor_id: auth.user.id, p_result_checked: body.result,
      p_team_stats_checked: body.team, p_player_stats_checked: body.players, p_anomalies_checked: body.anomalies,
    })
  } else if (body.action === 'publish') {
    result = await admin.rpc('publish_esi_match_stats_manual', { p_match_id: matchId, p_actor_id: auth.user.id })
  } else if (body.action === 'return-to-correction') {
    result = await admin.rpc('return_esi_match_stats_to_correction', { p_match_id: matchId, p_actor_id: auth.user.id, p_reason: body.reason })
  } else {
    result = await admin.rpc('reopen_esi_match_stats', { p_match_id: matchId, p_actor_id: auth.user.id, p_reason: body.reason })
  }
  if (result.error) {
    const message = result.error.message.toLowerCase()
    if (message.includes('reopen published') || message.includes('only published') || message.includes('not ready')
      || message.includes('review is required')) return json(409, { error: 'workflow_conflict' })
    if (message.includes('complete') || message.includes('inconsistent') || message.includes('required')) return json(422, { error: 'validation_failed' })
    if (message.includes('statistician access')) return json(403, { error: 'forbidden' })
    return json(500, { error: 'save_failed' })
  }
  revalidatePath('/stats')
  revalidatePath(`/stats/${matchId}`)
  if (body.action === 'publish' || body.action === 'reopen') {
    revalidatePath(`/matchs/${matchId}`)
    revalidatePath('/matchs')
    revalidatePath('/classement')
  }
  return json(200, { ok: true, result: result.data })
}
