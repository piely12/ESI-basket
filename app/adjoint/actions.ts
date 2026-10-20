'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/requireUser'
import type { CourtSlot } from '@/lib/lineup'
import type { MatchAvailability, CompositionActionResult } from '@/app/coach/actions'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function authorizedMatch(matchId: string, teamId: string) {
  if (!UUID.test(matchId) || !UUID.test(teamId)) throw new Error('Match ou équipe invalide.')
  const { supabase, profile } = await requireRole('coach_adjoint')
  if (!profile.team_id || profile.team_id !== teamId) throw new Error('Équipe hors périmètre.')
  const [{ data: team }, { data: match }] = await Promise.all([
    supabase.from('teams').select('id').eq('id', teamId).eq('is_esi', true).maybeSingle(),
    supabase.from('matches').select('id,home_team_id,away_team_id').eq('id', matchId).maybeSingle(),
  ])
  if (!team || !match || ![match.home_team_id, match.away_team_id].includes(teamId)) throw new Error('Match ESI introuvable.')
  return { supabase, match }
}

export async function saveAssistantCompositionDraft(input: {
  matchId: string
  teamId: string
  availability: MatchAvailability[]
  selectedPlayerIds: string[]
  courtSlots: Partial<Record<CourtSlot, string>>
}): Promise<CompositionActionResult> {
  if (!input || typeof input !== 'object' || !Array.isArray(input.availability) || !Array.isArray(input.selectedPlayerIds)
    || input.availability.some((item) => !item || typeof item !== 'object' || !UUID.test(item.player_id) || !['disponible', 'blesse', 'indisponible'].includes(item.availability_status))
    || input.selectedPlayerIds.some((id) => !UUID.test(id))
    || new Set(input.selectedPlayerIds).size !== input.selectedPlayerIds.length
    || input.selectedPlayerIds.length > 12) return { ok: false, error: 'Données de composition invalides.' }

  const { supabase, match } = await authorizedMatch(input.matchId, input.teamId)
  const { error } = await supabase.rpc('save_match_composition_draft', {
    p_match_id: input.matchId,
    p_team_id: input.teamId,
    p_availability: input.availability,
    p_selected_player_ids: input.selectedPlayerIds,
    p_court_slots: input.courtSlots,
  })
  if (error) return { ok: false, error: error.message.includes('verrouill') ? 'La composition est verrouillée après le coup d’envoi.' : 'Impossible d’enregistrer le brouillon. Vérifie la composition et les droits.' }
  revalidatePath('/adjoint')
  revalidatePath('/adjoint/matchs/' + match.id)
  return { ok: true, status: 'brouillon' }
}

export async function publishAssistantComposition(matchId: string, teamId: string): Promise<CompositionActionResult> {
  const { supabase, match } = await authorizedMatch(matchId, teamId)
  const { data, error } = await supabase.rpc('publish_match_composition', { p_match_id: matchId, p_team_id: teamId })
  if (error) {
    const message = error.message.toLowerCase()
    return { ok: false, error: message.includes('12 joueurs') ? 'Il faut exactement 12 joueurs disponibles.'
      : message.includes('cinq titulaires') || message.includes('cinq postes') ? 'Choisis exactement cinq titulaires.'
      : message.includes('verrouill') ? 'La composition est verrouillée après le coup d’envoi.'
      : 'La publication a échoué. Vérifie les disponibilités et les cinq titulaires.' }
  }
  revalidatePath('/adjoint')
  revalidatePath('/adjoint/matchs/' + match.id)
  revalidatePath('/matchs')
  revalidatePath('/matchs/' + match.id)
  revalidatePath('/joueurs')
  return { ok: true, status: String(data ?? 'publiee') }
}
