'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAnyRole } from '@/lib/auth/requireUser'
import { COURT_SLOTS, type CourtSlot } from '@/lib/lineup'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getAuthorizedMatch(matchId: string) {
  if (!UUID.test(matchId)) throw new Error('Match invalide.')
  const { supabase, profile, user } = await requireAnyRole(['coach', 'admin'])

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
    userId: user.id,
    match,
    teamIds: profile.role === 'admin'
      ? [match.home_team_id, match.away_team_id]
      : [profile.team_id as string],
  }
}

async function getCoachAuthorizedMatch(matchId: string) {
  if (!UUID.test(matchId)) throw new Error('Match invalide.')
  const { supabase, profile, user } = await requireAnyRole(['coach'])
  const { data: match, error } = await supabase.from('matches')
    .select('id, home_team_id, away_team_id')
    .eq('id', matchId)
    .maybeSingle()
  if (error || !match) throw new Error('Match introuvable.')
  if (!profile.team_id || ![match.home_team_id, match.away_team_id].includes(profile.team_id)) {
    throw new Error('Ce match ne concerne pas votre équipe.')
  }
  return { supabase, profile, userId: user.id, match, teamIds: [profile.team_id] }
}

function formIds(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name)
    .filter((value): value is string => typeof value === 'string' && UUID.test(value)))]
}

export type MatchAvailability = { player_id: string; availability_status: 'disponible' | 'blesse' | 'indisponible' }
export type CompositionActionResult = { ok: boolean; error?: string; status?: string }

function compositionRpcError(operation: string, error: { code?: string; message: string; details?: string | null; hint?: string | null }) {
  console.error(`Composition RPC ${operation} failed`, {
    code: error.code ?? null,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  })

  const missingRpc = error.code === 'PGRST202'
    || (error.code === '42883' && error.message.includes(operation) && /does not exist/i.test(error.message))
  if (missingRpc) {
    return 'La fonction de composition est introuvable dans Supabase. Vérifie que la migration 027 a été exécutée sur le projet utilisé par cette application.'
  }
  if (error.code === '42501' || /coach access required|coach principal requis/i.test(error.message)) {
    return 'Ce compte doit être rattaché au rôle Coach principal de l’équipe ESI.'
  }
  if (error.message.includes('verrouillée')) return 'La composition est verrouillée après le coup d’envoi.'
  return operation === 'save_match_composition_draft'
    ? 'Impossible d’enregistrer le brouillon. Vérifie les droits et la configuration Supabase.'
    : 'La publication a échoué. Vérifie les disponibilités et les droits du coach.'
}

export async function saveMatchCompositionDraft(input: {
  matchId: string
  teamId: string
  availability: MatchAvailability[]
  selectedPlayerIds: string[]
  courtSlots: Partial<Record<CourtSlot, string>>
}): Promise<CompositionActionResult> {
  if (!UUID.test(input.matchId) || !UUID.test(input.teamId)
    || !Array.isArray(input.availability) || !Array.isArray(input.selectedPlayerIds)
    || input.availability.some((item) => !UUID.test(item.player_id) || !['disponible','blesse','indisponible'].includes(item.availability_status))
    || input.selectedPlayerIds.some((id) => !UUID.test(id))) {
    return { ok: false, error: 'Données de composition invalides.' }
  }
  const { supabase, match, teamIds } = await getCoachAuthorizedMatch(input.matchId)
  if (!teamIds.includes(input.teamId)) return { ok: false, error: 'Cette équipe ne fait pas partie de votre périmètre.' }
  const { error } = await supabase.rpc('save_match_composition_draft', {
    p_match_id: input.matchId,
    p_team_id: input.teamId,
    p_availability: input.availability,
    p_selected_player_ids: input.selectedPlayerIds,
    p_court_slots: input.courtSlots,
  })
  if (error) return { ok: false, error: compositionRpcError('save_match_composition_draft', error) }
  revalidatePath('/coach')
  revalidatePath('/coach/matchs/' + match.id)
  return { ok: true, status: 'brouillon' }
}

export async function publishMatchComposition(matchId: string, teamId: string): Promise<CompositionActionResult> {
  if (!UUID.test(matchId) || !UUID.test(teamId)) return { ok: false, error: 'Match ou équipe invalide.' }
  const { supabase, match, teamIds } = await getCoachAuthorizedMatch(matchId)
  if (!teamIds.includes(teamId)) return { ok: false, error: 'Cette équipe ne fait pas partie de votre périmètre.' }
  const { data, error } = await supabase.rpc('publish_match_composition', {
    p_match_id: matchId,
    p_team_id: teamId,
  })
  if (error) {
    const message = error.message.toLowerCase()
    const rpcError = compositionRpcError('publish_match_composition', error)
    const friendly = message.includes('12 joueurs') ? 'Il faut exactement 12 joueurs disponibles.'
      : message.includes('cinq titulaires') || message.includes('cinq postes') ? 'Choisis cinq titulaires sur des postes différents.'
      : rpcError
    return { ok: false, error: friendly }
  }
  revalidatePath('/coach')
  revalidatePath('/coach/matchs/' + match.id)
  revalidatePath('/matchs')
  revalidatePath('/matchs/' + match.id)
  revalidatePath('/joueurs')
  return { ok: true, status: String(data ?? 'publiee') }
}

async function getAdminAuthorizedMatch(matchId: string) {
  const context = await getAuthorizedMatch(matchId)
  if (context.profile.role !== 'admin') throw new Error('Cette action est réservée à l’administration.')
  return context
}

async function getCoachIdentity() {
  const { supabase, profile, user } = await requireAnyRole(['coach', 'admin'])

  let teamId = profile.team_id
  if (!teamId && profile.role === 'admin') {
    const { data: esi } = await supabase.from('teams').select('id').eq('is_esi', true).maybeSingle()
    teamId = esi?.id ?? null
  }
  if (!teamId) redirect('/acces-refuse')
  return { supabase, profile, userId: user.id, teamId }
}

function formText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function formDateTime(formData: FormData, key: string) {
  const value = formText(formData, key, 32)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choisis une date et une heure valides.')
  // The application timezone is Africa/Abidjan (UTC), regardless of server region.
  const parsed = new Date(value + ':00+00:00')
  if (!Number.isFinite(parsed.getTime())) throw new Error('La date du match est invalide.')
  return parsed.toISOString()
}

function formInteger(formData: FormData, key: string, options: { min?: number; max?: number; signed?: boolean } = {}) {
  const value = formText(formData, key, 20)
  if (value === '') return 0
  const parsed = Number(value)
  const min = options.min ?? (options.signed ? -300 : 0)
  const max = options.max ?? 300
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error('Une valeur de statistique est invalide.')
  return parsed
}

export async function createMatch(formData: FormData) {
  const { supabase, profile, teamId } = await getCoachIdentity()
  if (profile.role !== 'admin') throw new Error('Seule l’administration peut modifier le calendrier.')
  const opponentId = formText(formData, 'opponent_id', 64)
  const homeAway = formText(formData, 'home_away', 8)
  const location = formText(formData, 'location', 160)
  const scheduledAt = formDateTime(formData, 'scheduled_at')
  const competitionId = formText(formData, 'competition_id', 64)
  if (!UUID.test(opponentId) || opponentId === teamId) throw new Error('Choisis un adversaire valide.')
  if (homeAway !== 'home' && homeAway !== 'away') throw new Error('Choisis le terrain du match.')
  if (competitionId && !UUID.test(competitionId)) throw new Error('La compétition choisie est invalide.')

  const [{ data: opponent }, { data: competition }] = await Promise.all([
    supabase.from('teams').select('id').eq('id', opponentId).maybeSingle(),
    competitionId ? supabase.from('competitions').select('id').eq('id', competitionId).maybeSingle() : Promise.resolve({ data: null }),
  ])
  if (!opponent) throw new Error('L’équipe adverse est introuvable.')
  if (competitionId && !competition) throw new Error('La compétition choisie est introuvable.')

  const { data: match, error } = await supabase.from('matches').insert({
    competition_id: competitionId || null,
    home_team_id: homeAway === 'home' ? teamId : opponentId,
    away_team_id: homeAway === 'home' ? opponentId : teamId,
    scheduled_at: scheduledAt,
    location: location || null,
    status: 'programme',
  }).select('id').single()
  if (error || !match) throw new Error('Impossible de créer le match. Vérifie les droits RLS et la migration 009.')

  revalidatePath('/coach')
  redirect('/coach/matchs/' + match.id)
}

export async function updatePlayerAvailability(formData: FormData) {
  const { supabase, profile, teamId } = await getCoachIdentity()
  if (profile.role !== 'admin') throw new Error('Les disponibilités globales sont réservées à l’administration. Utilise l’étape 1 pour ce match.')
  const playerId = formText(formData, 'player_id', 64)
  const status = formText(formData, 'status', 24)
  if (!UUID.test(playerId) || !['actif', 'blesse', 'suspendu'].includes(status)) throw new Error('La disponibilité sélectionnée est invalide.')

  const { data: player } = await supabase.from('players').select('id').eq('id', playerId).eq('team_id', teamId).maybeSingle()
  if (!player) throw new Error('Ce joueur ne fait pas partie de votre effectif.')
  const { error } = await supabase.from('players').update({ status }).eq('id', playerId).eq('team_id', teamId)
  if (error) throw new Error('Impossible d’enregistrer la disponibilité du joueur.')
  revalidatePath('/coach')
  revalidatePath('/coach/equipe')
}

export async function updateMatchDetails(formData: FormData) {
  const matchId = formText(formData, 'match_id', 64)
  const { supabase, match } = await getAdminAuthorizedMatch(matchId)
  const location = formText(formData, 'location', 160)
  const scheduledAt = formDateTime(formData, 'scheduled_at')
  const { error } = await supabase.from('matches').update({
    scheduled_at: scheduledAt,
    location: location || null,
    kickoff_confirmed: true,
  }).eq('id', match.id)
  if (error) throw new Error('Impossible de modifier les informations du match.')
  revalidatePath('/coach')
  revalidatePath('/coach/matchs/' + match.id)
  redirect('/coach/matchs/' + match.id + '?saved=details')
}

export async function updateMatchStatus(formData: FormData) {
  const matchId = formText(formData, 'match_id', 64)
  const { supabase, match } = await getAdminAuthorizedMatch(matchId)
  const status = formText(formData, 'status', 24)
  if (!['programme', 'a_venir', 'jour_j', 'en_cours'].includes(status)) throw new Error('Le statut choisi est invalide.')
  const { error } = await supabase.from('matches').update({ status }).eq('id', match.id)
  if (error) throw new Error('Impossible de modifier le statut du match.')
  revalidatePath('/coach')
  revalidatePath('/coach/matchs/' + match.id)
  redirect('/coach/matchs/' + match.id + '?saved=details')
}

export async function saveMatchPreparation(formData: FormData) {
  const matchId = formText(formData, 'match_id', 64)
  const { supabase, userId, teamIds, match } = await getAdminAuthorizedMatch(matchId)
  const gamePlan = formText(formData, 'game_plan', 5000)
  const opponentNotes = formText(formData, 'opponent_notes', 5000)
  const teamId = teamIds[0]
  const { error } = await supabase.from('match_preparations').upsert({
    match_id: match.id, team_id: teamId, game_plan: gamePlan, opponent_notes: opponentNotes,
    updated_by: userId, updated_at: new Date().toISOString(),
  }, { onConflict: 'match_id,team_id' })
  if (error) throw new Error('Impossible d’enregistrer la préparation privée. Vérifie que la migration 009 est appliquée.')
  revalidatePath('/coach/matchs/' + match.id)
  redirect('/coach/matchs/' + match.id + '?saved=preparation')
}

export async function saveMatchResult(formData: FormData) {
  const matchId = formText(formData, 'match_id', 64)
  const { supabase, match } = await getAdminAuthorizedMatch(matchId)
  const homeScore = formInteger(formData, 'home_score', { max: 250 })
  const awayScore = formInteger(formData, 'away_score', { max: 250 })
  if (homeScore === awayScore) throw new Error('Un match de basketball terminé doit désigner une équipe gagnante.')
  const { error } = await supabase.from('matches').update({
    home_score: homeScore, away_score: awayScore, status: 'termine',
  }).eq('id', match.id)
  if (error) throw new Error('Impossible d’enregistrer le résultat.')
  revalidatePath('/coach')
  revalidatePath('/coach/matchs/' + match.id)
  revalidatePath('/')
  revalidatePath('/classement')
  revalidatePath('/matchs')
  revalidatePath('/matchs/' + match.id)
  revalidatePath('/equipes/' + match.home_team_id)
  revalidatePath('/equipes/' + match.away_team_id)
  redirect('/coach/matchs/' + match.id + '?saved=resultat')
}

export async function savePlayerStats(formData: FormData) {
  const matchId = formText(formData, 'match_id', 64)
  const { supabase, match } = await getAdminAuthorizedMatch(matchId)
  const playerIds = formIds(formData, 'player_ids')
  const [{ data: roster, error: rosterError }, { data: players, error: playersError }] = await Promise.all([
    supabase.from('match_rosters').select('player_id').eq('match_id', match.id).eq('is_called_up', true),
    supabase.from('players').select('id,team_id').in('id', playerIds.length ? playerIds : ['00000000-0000-0000-0000-000000000000']),
  ])
  if (rosterError || playersError) throw new Error('Impossible de vérifier les joueurs convoqués.')
  const calledUp = new Set((roster ?? []).map((row) => row.player_id))
  if (playerIds.some((id) => !calledUp.has(id)) || (players ?? []).length !== playerIds.length) {
    throw new Error('Les statistiques doivent concerner uniquement les joueurs convoqués.')
  }
  const rows = playerIds.map((playerId) => {
    const evaluationText = formText(formData, 'evaluation_' + playerId, 20)
    const evaluation = evaluationText === '' ? null : Number(evaluationText)
    if (evaluation !== null && (!Number.isFinite(evaluation) || evaluation < 0 || evaluation > 100)) {
      throw new Error('L’évaluation doit être comprise entre 0 et 100.')
    }
    const minutesText = formText(formData, 'minutes_' + playerId, 20)
    const minutes = minutesText === '' ? 0 : Number(minutesText)
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 60) throw new Error('Les minutes jouées doivent être comprises entre 0 et 60.')
    return {
      match_id: match.id,
      player_id: playerId,
      minutes_played: minutes,
      points: formInteger(formData, 'points_' + playerId, { max: 150 }),
      rebounds: formInteger(formData, 'rebounds_' + playerId, { max: 100 }),
      assists: formInteger(formData, 'assists_' + playerId, { max: 100 }),
      steals: formInteger(formData, 'steals_' + playerId, { max: 100 }),
      blocks: formInteger(formData, 'blocks_' + playerId, { max: 100 }),
      turnovers: formInteger(formData, 'turnovers_' + playerId, { max: 100 }),
      plus_minus: formInteger(formData, 'plus_minus_' + playerId, { signed: true }),
      evaluation,
      published_at: null,
      published_by: null,
    }
  })
  if (rows.length) {
    const { error } = await supabase.from('match_player_stats').upsert(rows, { onConflict: 'match_id,player_id' })
    if (error) throw new Error('Impossible d’enregistrer les statistiques. Vérifie la migration 009 et les droits RLS.')
  }
  revalidatePath('/coach/matchs/' + match.id)
  revalidatePath('/matchs/' + match.id)
  redirect('/coach/matchs/' + match.id + '?saved=statistiques')
}
