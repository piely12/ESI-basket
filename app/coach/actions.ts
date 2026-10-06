'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

const COACH_ROLES = ['coach', 'coach_adjoint', 'admin']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getAuthorizedMatch(matchId: string) {
  if (!UUID.test(matchId)) throw new Error('Match invalide.')
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Connexion requise.')

  const profile = await getCurrentUserProfile(supabase)
  if (!profile || !COACH_ROLES.includes(profile.role)) throw new Error('Accès réservé au staff coach.')

  const { data: match, error } = await supabase.from('matches')
    .select('id, home_team_id, away_team_id')
    .eq('id', matchId)
    .maybeSingle()
  if (error || !match) throw new Error('Match introuvable.')

  if (profile.role !== 'admin' && (!profile.team_id || ![match.home_team_id, match.away_team_id].includes(profile.team_id))) {
    throw new Error('Ce match ne concerne pas votre équipe.')
  }

  return {
    supabase,
    profile,
    userId: auth.user.id,
    match,
    teamIds: profile.role === 'admin'
      ? [match.home_team_id, match.away_team_id]
      : [profile.team_id as string],
  }
}

function formIds(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name)
    .filter((value): value is string => typeof value === 'string' && UUID.test(value)))]
}

async function syncRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'match_rosters' | 'convocations',
  desiredIds: string[],
  existingRows: { id: string; player_id: string }[],
  newRows: (playerId: string) => Record<string, string | number | boolean | null>,
) {
  const desired = new Set(desiredIds)
  const retained = new Set<string>()
  const removeIds: string[] = []
  for (const row of existingRows) {
    if (!desired.has(row.player_id) || retained.has(row.player_id)) removeIds.push(row.id)
    else retained.add(row.player_id)
  }

  for (const rowId of removeIds) {
    const { error } = await supabase.from(table).delete().eq('id', rowId)
    if (error) throw new Error(`Impossible de mettre à jour ${table}.`)
  }

  const missing = desiredIds.filter((id) => !retained.has(id))
  if (missing.length) {
    const { error } = await supabase.from(table).insert(missing.map(newRows))
    if (error) throw new Error(`Impossible d’enregistrer ${table}.`)
  }
}

export async function saveConvocations(formData: FormData) {
  const matchId = String(formData.get('match_id') ?? '')
  const { supabase, userId, match, teamIds } = await getAuthorizedMatch(matchId)
  const playerIds = formIds(formData, 'player_ids')

  const { data: players, error: playersError } = await supabase.from('players')
    .select('id,team_id,jersey_number')
    .in('team_id', teamIds)
    .in('id', playerIds.length ? playerIds : ['00000000-0000-0000-0000-000000000000'])
  if (playersError || (players?.length ?? 0) !== playerIds.length) throw new Error('La sélection contient un joueur hors effectif.')

  const [{ data: roster, error: rosterError }, { data: convocations, error: convocationsError }] = await Promise.all([
    supabase.from('match_rosters').select('id,player_id').eq('match_id', matchId),
    supabase.from('convocations').select('id,player_id').eq('match_id', matchId),
  ])
  if (rosterError || convocationsError) throw new Error('Impossible de lire les convocations existantes.')

  await syncRows(supabase, 'match_rosters', playerIds, roster ?? [], (playerId) => ({
    match_id: matchId,
    player_id: playerId,
    is_called_up: true,
  }))
  await syncRows(supabase, 'convocations', playerIds, convocations ?? [], (playerId) => ({
    match_id: matchId,
    player_id: playerId,
    sent_by: userId,
  }))

  revalidatePath('/coach')
  revalidatePath(`/matchs/${match.id}`)
  revalidatePath(`/coach/matchs/${match.id}`)
  redirect(`/coach/matchs/${match.id}?saved=convocations`)
}

export async function saveComposition(formData: FormData) {
  const matchId = String(formData.get('match_id') ?? '')
  const { supabase, match } = await getAuthorizedMatch(matchId)
  const starters = formIds(formData, 'starter_ids')
  if (starters.length > 5) throw new Error('Une composition ne peut pas dépasser cinq titulaires.')

  const [{ data: roster, error: rosterError }, { data: current, error: currentError }] = await Promise.all([
    supabase.from('match_rosters').select('player_id').eq('match_id', matchId),
    supabase.from('match_lineups').select('id,player_id,is_starter').eq('match_id', matchId),
  ])
  if (rosterError || currentError) throw new Error('Impossible de lire la composition existante.')

  const rosterIds = new Set((roster ?? []).map((row) => row.player_id))
  if (starters.some((id) => !rosterIds.has(id))) throw new Error('Les titulaires doivent être choisis parmi les joueurs convoqués.')

  const existingByPlayer = new Map((current ?? []).map((row) => [row.player_id, row]))
  for (const row of current ?? []) {
    if (!rosterIds.has(row.player_id)) {
      const { error } = await supabase.from('match_lineups').delete().eq('id', row.id)
      if (error) throw new Error('Impossible de nettoyer la composition précédente.')
    }
  }

  for (const playerId of rosterIds) {
    const isStarter = starters.includes(playerId)
    const existing = existingByPlayer.get(playerId)
    if (!existing) {
      const { error } = await supabase.from('match_lineups').insert({
        match_id: matchId,
        player_id: playerId,
        is_starter: isStarter,
      })
      if (error) throw new Error('Impossible d’enregistrer la composition.')
    } else if (existing.is_starter !== isStarter) {
      const { error } = await supabase.from('match_lineups').update({ is_starter: isStarter }).eq('id', existing.id)
      if (error) throw new Error('Impossible de modifier la composition.')
    }
  }

  revalidatePath(`/coach/matchs/${match.id}`)
  revalidatePath(`/matchs/${match.id}`)
  redirect(`/coach/matchs/${match.id}?saved=composition`)
}
