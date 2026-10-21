import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import StatsEditor, { type Draft, type PlayerDraft, type TeamDraft } from './StatsEditor'
import { requireRole } from '@/lib/auth/requireUser'

type PageProps = { params: Promise<{ id: string }> }
type Player = { id: string; first_name: string; last_name: string; jersey_number: number | null; position: string | null }
type PlayerStat = Record<string, number | string | null> & { player_id: string; published_at: string | null }
type TeamStat = Record<string, number | string | null>
const playerKeys = ['minutes_played', 'points', 'personal_fouls', 'rebounds_defensive', 'rebounds_offensive', 'assists', 'steals', 'blocks', 'turnovers', 'fg_made', 'fg_attempted', 'three_made', 'three_attempted', 'ft_made', 'ft_attempted'] as const
const teamKeys = ['points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'personal_fouls', 'fg_made', 'fg_attempted', 'three_made', 'three_attempted', 'ft_made', 'ft_attempted'] as const
const numberOrNull = (value: number | string | null | undefined) => value === null || value === undefined ? null : Number(value)
const playerStatsSelect: string = `player_id,${playerKeys.join(',')},published_at`
const teamStatsSelect: string = `${teamKeys.join(',')},published_at`

export default async function StatsMatchPage({ params }: PageProps) {
  const [{ id }, { supabase, profile }] = await Promise.all([params, requireRole('statisticienne')])
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound()
  if (!profile.team_id) redirect('/acces-refuse')
  const { data: teamInfo, error: teamInfoError } = await supabase.from('teams').select('is_esi').eq('id', profile.team_id).maybeSingle()
  if (teamInfoError || !teamInfo?.is_esi) redirect('/acces-refuse')

  const { data: match, error: matchError } = await supabase.from('matches')
    .select('id,scheduled_at,status,location,home_team_id,away_team_id,home_score,away_score,home_team:teams!matches_home_team_id_fkey(name),away_team:teams!matches_away_team_id_fkey(name)')
    .eq('id', id).maybeSingle()
  if (matchError || !match || ![match.home_team_id, match.away_team_id].includes(profile.team_id) || match.status !== 'termine') notFound()

  const { data: roster, error: rosterError } = await supabase.from('match_rosters').select('player_id')
    .eq('match_id', id).eq('is_called_up', true)
  const rosterIds = [...new Set((roster ?? []).map((row) => row.player_id))]
  const [{ data: playerRows, error: playerError }, { data: statRows, error: statsError }, { data: teamRow, error: teamStatsError }, { data: workflowRow, error: workflowError }] = await Promise.all([
    rosterIds.length ? supabase.from('players').select('id,first_name,last_name,jersey_number,position').eq('team_id', profile.team_id).in('id', rosterIds).order('jersey_number') : Promise.resolve({ data: [], error: null }),
    supabase.from('match_player_stats').select(playerStatsSelect).eq('match_id', id).in('player_id', rosterIds.length ? rosterIds : ['00000000-0000-4000-8000-000000000000']),
    supabase.from('match_team_stats').select(teamStatsSelect).eq('match_id', id).eq('team_id', profile.team_id).maybeSingle(),
    supabase.from('match_stats_workflow').select('status,home_score_draft,away_score_draft,review_warnings,result_checked,team_stats_checked,player_stats_checked,anomalies_checked,correction_reason').eq('match_id', id).maybeSingle(),
  ])
  if (rosterError || playerError || statsError || teamStatsError || workflowError) return <main className="mx-auto max-w-5xl px-4 py-8"><p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">Impossible de charger cette feuille. Actualise la page puis réessaie.</p></main>

  const players = (playerRows ?? []) as Player[]
  if (players.length === 0) return <main className="mx-auto max-w-5xl space-y-5 px-4 py-8"><Link href="/stats" className="font-semibold underline">Retour aux matchs</Link><section className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center"><h1 className="font-display text-3xl text-brand">Aucun joueur convoqué</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">Le coach doit valider la liste des joueurs avant la saisie.</p></section></main>

  const statByPlayer = new Map(((statRows ?? []) as unknown as PlayerStat[]).map((row) => [row.player_id, row]))
  const teamStats = (teamRow ?? {}) as TeamStat
  const homeTeam = match.home_team as unknown as { name: string } | null
  const awayTeam = match.away_team as unknown as { name: string } | null
  const esiIsHome = match.home_team_id === profile.team_id
  const workflow = workflowRow as { status: string; home_score_draft: number | null; away_score_draft: number | null; review_warnings: string[]; result_checked: boolean; team_stats_checked: boolean; player_stats_checked: boolean; anomalies_checked: boolean; correction_reason: string | null } | null
  const legacyPublished = players.every((player) => !!statByPlayer.get(player.id)?.published_at)
  const initial = {
    esi_score: numberOrNull(workflow ? (esiIsHome ? workflow.home_score_draft : workflow.away_score_draft) : (esiIsHome ? match.home_score : match.away_score)),
    opponent_score: numberOrNull(workflow ? (esiIsHome ? workflow.away_score_draft : workflow.home_score_draft) : (esiIsHome ? match.away_score : match.home_score)),
    team: Object.fromEntries(teamKeys.map((key) => [key, numberOrNull(teamStats[key])])) as TeamDraft,
    players: players.map((player) => {
      const row = statByPlayer.get(player.id)
      return { player_id: player.id, ...Object.fromEntries(playerKeys.map((key) => [key, numberOrNull(row?.[key])])) as Omit<PlayerDraft, 'player_id'> }
    }),
  } satisfies Draft

  return <main className="mx-auto max-w-5xl space-y-6 px-4 pb-24 pt-8 sm:px-5">
    <Link href="/stats" className="inline-flex min-h-10 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-deep)]">Retour aux feuilles</Link>
    <header className="rounded-2xl bg-maroon-panel p-6 text-on-brand sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">Match terminé · statistiques ESI</p><h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">{homeTeam?.name ?? 'Équipe'} <span className="text-[var(--gold-500)]">·</span> {awayTeam?.name ?? 'Équipe'}</h1><p className="mt-3 text-sm text-on-brand/80">{new Date(match.scheduled_at).toLocaleDateString('fr-FR', { dateStyle: 'full', timeZone: 'Africa/Abidjan' })}{match.location ? ` · ${match.location}` : ''}</p></header>
    <StatsEditor matchId={id} matchStatus={match.status} esiName={profile.team_id === match.home_team_id ? homeTeam?.name ?? 'ESI' : awayTeam?.name ?? 'ESI'} opponentName={profile.team_id === match.home_team_id ? awayTeam?.name ?? 'Adversaire' : homeTeam?.name ?? 'Adversaire'} players={players} initial={initial} workflow={workflow ?? { status: legacyPublished ? 'publie' : 'brouillon', home_score_draft: null, away_score_draft: null, review_warnings: [], result_checked: false, team_stats_checked: false, player_stats_checked: false, anomalies_checked: false, correction_reason: null }} />
  </main>
}
