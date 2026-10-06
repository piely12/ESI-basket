import { createClient } from '@/lib/supabase/server'

export type Team = { id: string; name: string; city: string | null; logo_url: string | null; is_esi: boolean }
export type MatchRow = {
  id: string
  scheduled_at: string
  location: string | null
  round_number: number | null
  kickoff_confirmed: boolean
  public_note: string | null
  status: 'programme' | 'a_venir' | 'jour_j' | 'en_cours' | 'termine'
  home_score: number | null
  away_score: number | null
  home_team: Team
  away_team: Team
}
export type Player = {
  id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position: string | null
  photo_url: string | null
  status: 'actif' | 'blesse' | 'suspendu'
}
export type StandingRow = {
  team_id: string
  team: Team
  played: number
  won: number
  lost: number
  points_for: number
  points_against: number
  ranking_points: number
}

// Un match, avec ses deux équipes déjà jointes.
const MATCH_SELECT = `
  id, scheduled_at, location, round_number, kickoff_confirmed, public_note, status, home_score, away_score,
  home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),
  away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)
`

export async function getNextMatch(): Promise<MatchRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches').select(MATCH_SELECT)
    .in('status', ['programme', 'a_venir', 'jour_j', 'en_cours'])
    .order('scheduled_at', { ascending: true }).limit(100)
  const matches = (data as unknown as MatchRow[]) ?? []
  return matches.find((match) => match.home_team.is_esi || match.away_team.is_esi) ?? null
}

export async function getLastResult(): Promise<MatchRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches').select(MATCH_SELECT)
    .eq('status', 'termine')
    .order('scheduled_at', { ascending: false }).limit(100)
  const matches = (data as unknown as MatchRow[]) ?? []
  return matches.find((match) => match.home_team.is_esi || match.away_team.is_esi) ?? null
}

export async function getAllMatches(): Promise<MatchRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches').select(MATCH_SELECT)
    .order('scheduled_at', { ascending: true })
  return (data as unknown as MatchRow[]) ?? []
}

export type LineupRow = {
  is_starter: boolean
  player: { id: string; first_name: string; last_name: string; jersey_number: number | null; position: string | null; photo_url: string | null }
}

export async function getMatchById(id: string) {
  const supabase = await createClient()
  const { data: match } = await supabase
    .from('matches').select(MATCH_SELECT).eq('id', id).maybeSingle()
  if (!match) return null

  const [{ data: teamStats }, { data: playerStats }, { data: lineups }] = await Promise.all([
    supabase.from('match_team_stats')
      .select('id, match_id, team_id, points, rebounds, assists, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted, published_at, created_at')
      .eq('match_id', id).not('published_at', 'is', null),
    supabase
      .from('match_player_stats')
      .select('*, player:players(id,first_name,last_name,jersey_number,position)')
      .eq('match_id', id).not('published_at', 'is', null),
    supabase
      .from('match_lineups')
      .select('is_starter, player:players(id,first_name,last_name,jersey_number,position,photo_url)')
      .eq('match_id', id),
  ])

  return {
    match: match as unknown as MatchRow,
    teamStats: teamStats ?? [],
    playerStats: playerStats ?? [],
    lineups: (lineups ?? []) as unknown as LineupRow[],
  }
}

export async function getStandings(): Promise<StandingRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('standings')
    .select('team_id, played, won, lost, points_for, points_against, ranking_points, team:teams(id,name,city,logo_url,is_esi)')
    .order('ranking_points', { ascending: false })
    .order('points_for', { ascending: false })
  return (data as unknown as StandingRow[]) ?? []
}

export async function getRoster(): Promise<Player[]> {
  const supabase = await createClient()
  const { data: esi } = await supabase.from('teams').select('id').eq('is_esi', true).maybeSingle()
  if (!esi) return []
  const { data } = await supabase
    .from('players').select('id, first_name, last_name, jersey_number, position, photo_url, status')
    .eq('team_id', esi.id)
    .order('jersey_number', { ascending: true })
  return data ?? []
}

export async function getPlayerProfile(id: string) {
  const supabase = await createClient()
  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, jersey_number, position, photo_url, status')
    .eq('id', id).maybeSingle()
  if (!player) return null

  const { data: stats } = await supabase
    .from('match_player_stats')
    .select('*, match:matches(id,scheduled_at,status,home_team:teams!matches_home_team_id_fkey(name,is_esi),away_team:teams!matches_away_team_id_fkey(name,is_esi))')
    .eq('player_id', id).not('published_at', 'is', null)
    .order('created_at', { ascending: false })

  return { player, stats: stats ?? [] }
}
