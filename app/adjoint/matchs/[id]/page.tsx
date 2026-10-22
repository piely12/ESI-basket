import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import CompositionWizard from '@/components/CompositionWizard'
import { requireRole } from '@/lib/auth/requireUser'
import type { Team } from '@/lib/data/public'
import type { CourtSlot, LineupPlayer } from '@/lib/lineup'
import { isMatchLockedByTime } from '@/lib/match-time'
import { publishAssistantComposition, saveAssistantCompositionDraft } from '../../actions'
import styles from '../../../coach/coach.module.css'

type PageProps = { params: Promise<{ id: string }> }
type Workflow = {
  status: 'brouillon' | 'publiee' | 'verrouillee'
  draft_availability: { player_id: string; availability_status: 'disponible' | 'blesse' | 'indisponible' }[]
  draft_selected_player_ids: string[]
  draft_court_slots: Partial<Record<CourtSlot, string>>
}

export default async function AssistantMatchPage({ params }: PageProps) {
  const [{ id }, { supabase, profile }] = await Promise.all([params, requireRole('coach_adjoint')])
  if (!profile.team_id) redirect('/acces-refuse')
  const { data: teamRow } = await supabase.from('teams').select('id').eq('id', profile.team_id).eq('is_esi', true).maybeSingle()
  if (!teamRow) redirect('/acces-refuse')

  const { data: match } = await supabase.from('matches')
    .select('id,scheduled_at,location,kickoff_confirmed,status,home_team_id,away_team_id,home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)')
    .eq('id', id).maybeSingle()
  if (!match) notFound()
  if (![match.home_team_id, match.away_team_id].includes(teamRow.id)) redirect('/acces-refuse')
  const compositionTeam = (match.home_team_id === teamRow.id ? match.home_team : match.away_team) as unknown as Team
  const opponent = (match.home_team_id === teamRow.id ? match.away_team : match.home_team) as unknown as Team
  const [playersResult, workflowResult] = await Promise.all([
    supabase.from('players').select('id,first_name,last_name,jersey_number,position').eq('team_id', teamRow.id).order('jersey_number'),
    supabase.from('match_composition_workflows').select('status,draft_availability,draft_selected_player_ids,draft_court_slots').eq('match_id', id).eq('team_id', teamRow.id).maybeSingle(),
  ])
  if (playersResult.error || workflowResult.error) throw new Error('Impossible de charger les éléments publics de la composition.')
  const players = (playersResult.data ?? []) as LineupPlayer[]
  const workflow = workflowResult.data as Workflow | null
  const locked = isMatchLockedByTime(match.scheduled_at, match.status)

  return <main className={styles.page}>
    <Link className={styles.link} href="/adjoint">← Retour aux matchs</Link>
    <CompositionWizard
      matchId={match.id} team={compositionTeam} opponent={opponent} scheduledAt={match.scheduled_at}
      location={match.location} kickoffConfirmed={match.kickoff_confirmed}
      coachName="SAIH PIELY URIEL" players={players}
      initialAvailability={workflow?.draft_availability ?? []}
      initialSelectedIds={workflow?.draft_selected_player_ids ?? []}
      initialSlots={workflow?.draft_court_slots ?? {}}
      initialStatus={locked ? 'verrouillee' : workflow?.status ?? 'brouillon'}
      canOverrideLock={false} requireSeventeenPlayers saveAction={saveAssistantCompositionDraft} publishAction={publishAssistantComposition}
    />
  </main>
}
