import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { PUBLIC_DATA_TAG } from '@/lib/data/revalidate'

export type Team = { id: string; name: string; city: string | null; logo_url: string | null; is_esi: boolean }
export type MatchRow = {
  id: string
  season_id: string | null
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
  rank: number
  played: number
  won: number
  lost: number
  points_for: number
  points_against: number
  ranking_points: number
  difference: number
}

export type TeamSeasonStat = {
  match_id: string
  team_id: string
  points: number | null
  rebounds: number | null
  assists: number | null
  steals: number | null
  blocks: number | null
  turnovers: number | null
  personal_fouls: number | null
  fg_made: number | null
  fg_attempted: number | null
  three_made: number | null
  three_attempted: number | null
  ft_made: number | null
  ft_attempted: number | null
  published_at: string | null
}

export type PlayerSeasonStat = TeamSeasonStat & {
  id: string
  player_id: string
  minutes_played: number | null
  rebounds_defensive: number | null
  rebounds_offensive: number | null
  player: Player
}

export type MatchTeamStat = TeamSeasonStat & { id: string }

export type PublicMatchPlayerStat = {
  id: string
  player_id: string
  minutes_played: number | null
  points: number | null
  rebounds: number | null
  rebounds_defensive: number | null
  rebounds_offensive: number | null
  personal_fouls: number | null
  assists: number | null
  steals: number | null
  blocks: number | null
  turnovers: number | null
  fg_made: number | null
  fg_attempted: number | null
  three_made: number | null
  three_attempted: number | null
  ft_made: number | null
  ft_attempted: number | null
  player: Pick<Player, 'id' | 'first_name' | 'last_name' | 'jersey_number' | 'position'>
}

export type PlayerProfileStat = {
  id: string
  match_id: string
  minutes_played: number | null
  points: number | null
  rebounds: number | null
  rebounds_defensive: number | null
  rebounds_offensive: number | null
  assists: number | null
  steals: number | null
  blocks: number | null
  turnovers: number | null
  personal_fouls: number | null
  fg_made: number | null
  fg_attempted: number | null
  three_made: number | null
  three_attempted: number | null
  ft_made: number | null
  ft_attempted: number | null
  match: (Pick<MatchRow, 'id' | 'scheduled_at' | 'status' | 'home_score' | 'away_score' | 'round_number'> & {
    season_id: string | null
    home_team: Pick<Team, 'id' | 'name' | 'is_esi'>
    away_team: Pick<Team, 'id' | 'name' | 'is_esi'>
  }) | null
}

// Un match, avec ses deux équipes déjà jointes.
const MATCH_SELECT = `
  id, season_id, scheduled_at, location, round_number, kickoff_confirmed, public_note, status, home_score, away_score,
  home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),
  away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)
`

async function optionalData<T>(query: PromiseLike<{ data: T | null }>): Promise<T | null> {
  try {
    return (await query).data
  } catch {
    return null
  }
}

async function loadNextMatch(): Promise<MatchRow | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('matches').select(MATCH_SELECT)
    .in('status', ['programme', 'a_venir', 'jour_j', 'en_cours'])
    .order('scheduled_at', { ascending: true }).limit(100)
  if (error) throw error
  const matches = (data as unknown as MatchRow[]) ?? []
  return matches.find((match) => match.home_team.is_esi || match.away_team.is_esi) ?? null
}

async function loadLastResult(): Promise<MatchRow | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('matches').select(MATCH_SELECT)
    .eq('status', 'termine')
    .order('scheduled_at', { ascending: false }).limit(100)
  if (error) throw error
  const matches = (data as unknown as MatchRow[]) ?? []
  return matches.find((match) => match.home_team.is_esi || match.away_team.is_esi) ?? null
}

export const MATCHES_PAGE_SIZE = 40

async function loadMatchesPage(offset = 0, limit = MATCHES_PAGE_SIZE): Promise<{ matches: MatchRow[]; hasMore: boolean }> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('matches').select(MATCH_SELECT)
    .order('scheduled_at', { ascending: true })
    .range(offset, offset + limit)
  if (error) throw new Error('Impossible de charger le calendrier des matchs.')
  const rows = (data as unknown as MatchRow[]) ?? []
  return { matches: rows.slice(0, limit), hasMore: rows.length > limit }
}

export type LineupRow = {
  is_starter: boolean
  court_slot: 'meneur' | 'arriere' | 'ailier' | 'ailier_fort' | 'pivot' | null
  player: { id: string; first_name: string; last_name: string; jersey_number: number | null; position: string | null; photo_url: string | null; team_id: string }
}

async function loadMatchById(id: string) {
  const supabase = createPublicClient()
  const { data: match, error: matchError } = await supabase
    .from('matches').select(MATCH_SELECT).eq('id', id).maybeSingle()
  if (matchError) throw matchError
  if (!match) return null

  const matchRow = match as unknown as MatchRow
  const esiTeam = matchRow.home_team.is_esi ? matchRow.home_team : matchRow.away_team
  const [teamStats, playerStats, workflow, coach, mvp] = await Promise.all([
    optionalData(supabase.from('match_team_stats')
      .select('id, match_id, team_id, points, rebounds, assists, steals, blocks, turnovers, personal_fouls, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted, published_at, created_at')
      .eq('match_id', id).not('published_at', 'is', null)),
    optionalData(supabase.from('match_player_stats')
      .select('id,match_id,player_id,minutes_played,points,rebounds,rebounds_defensive,rebounds_offensive,personal_fouls,assists,steals,blocks,turnovers,fg_made,fg_attempted,three_made,three_attempted,ft_made,ft_attempted,plus_minus,evaluation,published_at,created_at,updated_at,player:players(id,first_name,last_name,jersey_number,position)')
      .eq('match_id', id).not('published_at', 'is', null)),
    optionalData<{ status: string }>(supabase.from('match_composition_public_status').select('status').eq('match_id', id).eq('team_id', esiTeam.id).maybeSingle() as unknown as PromiseLike<{ data: { status: string } | null }>),
    optionalData<{ first_name: string; last_name: string }>(supabase.from('public_esi_coaches').select('first_name,last_name').eq('team_id', esiTeam.id).order('last_name').limit(1).maybeSingle() as unknown as PromiseLike<{ data: { first_name: string; last_name: string } | null }>),
    // Official MVP (migration 039). Read on its own so the page still works before the column exists.
    optionalData<{ mvp_player_id: string | null }>(supabase.from('matches').select('mvp_player_id').eq('id', id).maybeSingle() as unknown as PromiseLike<{ data: { mvp_player_id: string | null } | null }>),
  ])
  const lineups = workflow && ['publiee','verrouillee'].includes(workflow.status)
    ? await optionalData(supabase.from('match_lineups').select('is_starter,court_slot,player:players(id,first_name,last_name,jersey_number,position,photo_url,team_id)').eq('match_id', id))
    : []

  const historyFor = (teamId: string) => {
    let query = supabase.from('matches').select(MATCH_SELECT)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('status', 'termine').neq('id', id)
      .not('home_score', 'is', null).not('away_score', 'is', null)
      .order('scheduled_at', { ascending: false }).limit(5)
    if (matchRow.season_id) query = query.eq('season_id', matchRow.season_id)
    return query
  }
  const [homeHistory, awayHistory, standings] = await Promise.all([
    optionalData(historyFor(matchRow.home_team.id)),
    optionalData(historyFor(matchRow.away_team.id)),
    getStandings(matchRow.season_id ?? undefined).catch(() => []),
  ])


  return {
    match: matchRow,
    teamStats: (teamStats ?? []) as unknown as MatchTeamStat[],
    playerStats: (playerStats ?? []) as unknown as PublicMatchPlayerStat[],
    lineups: (lineups ?? []) as unknown as LineupRow[],
    standings,
    teamHistory: [
      { team: matchRow.home_team, matches: (homeHistory ?? []) as unknown as MatchRow[] },
      { team: matchRow.away_team, matches: (awayHistory ?? []) as unknown as MatchRow[] },
    ],
    compositionPublished: Boolean(workflow && ['publiee', 'verrouillee'].includes(workflow.status)),
    coachName: coach ? `${coach.first_name} ${coach.last_name}`.trim() : null,
    mvpPlayerId: mvp?.mvp_player_id ?? null,
  }
}

async function loadStandings(seasonId?: string): Promise<StandingRow[]> {
  const supabase = createPublicClient()
  const teamQuery = supabase.from('teams').select('id,name,city,logo_url,is_esi').order('name')
  const seasonQuery = supabase.from('seasons').select('id,name').eq('is_current', true).maybeSingle()
  const [{ data: teams, error: teamsError }, { data: currentSeason, error: seasonError }] = await Promise.all([teamQuery, seasonQuery])
  if (teamsError || seasonError) throw teamsError ?? seasonError
  const { data: selectedSeason } = seasonId
    ? await supabase.from('seasons').select('id,name').eq('id', seasonId).maybeSingle()
    : { data: currentSeason }
  const season = selectedSeason ?? currentSeason
  if (!teams?.length) return []

  const standings = new Map(teams.map((team) => [team.id, {
    team_id: team.id,
    team: team as Team,
    rank: 0,
    played: 0,
    won: 0,
    lost: 0,
    points_for: 0,
    points_against: 0,
    ranking_points: 0,
    difference: 0,
  } satisfies StandingRow]))

  let results: { home_team_id: string; away_team_id: string; home_score: number; away_score: number }[] = []
  if (season) {
    const response = await supabase.from('matches')
      .select('home_team_id,away_team_id,home_score,away_score')
      .eq('season_id', season.id)
      .eq('status', 'termine')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)

    if (response.error) throw response.error
    results = (response.data ?? []) as typeof results

    for (const result of results) {
      const home = standings.get(result.home_team_id)
      const away = standings.get(result.away_team_id)
      if (!home || !away || result.home_score === result.away_score) continue

      home.played += 1
      away.played += 1
      home.points_for += result.home_score
      home.points_against += result.away_score
      away.points_for += result.away_score
      away.points_against += result.home_score
      if (result.home_score > result.away_score) {
        home.won += 1
        away.lost += 1
      } else {
        away.won += 1
        home.lost += 1
      }
    }
  }

  const rows = [...standings.values()].map((row) => ({
    ...row,
    ranking_points: row.won * 2 + row.lost,
    difference: row.points_for - row.points_against,
  }))

  // The head-to-head mini-table is only a tiebreak after league points and
  // overall point difference, as specified by the competition rules.
  const tieGroups = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = `${row.ranking_points}:${row.difference}`
    const group = tieGroups.get(key) ?? []
    group.push(row)
    tieGroups.set(key, group)
  }

  const headToHead = new Map<string, { wins: number; difference: number }>()
  for (const group of tieGroups.values()) {
    if (group.length < 2) continue
    const ids = new Set(group.map((row) => row.team_id))
    const stats = new Map(group.map((row) => [row.team_id, { wins: 0, difference: 0 }]))
    for (const result of results) {
      if (!ids.has(result.home_team_id) || !ids.has(result.away_team_id)) continue
      const home = stats.get(result.home_team_id)!
      const away = stats.get(result.away_team_id)!
      home.difference += result.home_score - result.away_score
      away.difference += result.away_score - result.home_score
      if (result.home_score > result.away_score) home.wins += 1
      else if (result.away_score > result.home_score) away.wins += 1
    }
    for (const [id, value] of stats) headToHead.set(id, value)
  }

  const ordered = rows.map((row) => ({
    ...row,
    directWins: headToHead.get(row.team_id)?.wins ?? 0,
    directDifference: headToHead.get(row.team_id)?.difference ?? 0,
  })).sort((a, b) => b.ranking_points - a.ranking_points
    || b.difference - a.difference
    || b.directWins - a.directWins
    || b.directDifference - a.directDifference
    || a.team.name.localeCompare(b.team.name, 'fr'))

  let previous: StandingRow | undefined
  let previousDirectWins: number | undefined
  let previousDirectDifference: number | undefined
  return ordered.map((row, index) => {
    const sameRank = previous?.ranking_points === row.ranking_points
      && previous.difference === row.difference
      && previousDirectWins === row.directWins
      && previousDirectDifference === row.directDifference
    const ranked = { ...row, rank: sameRank ? previous!.rank : index + 1 }
    previous = ranked
    previousDirectWins = row.directWins
    previousDirectDifference = row.directDifference
    return ranked
  })
}

async function loadTeams(): Promise<Team[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.from('teams').select('id,name,city,logo_url,is_esi').order('name')
  if (error) throw error
  return (data as Team[] | null) ?? []
}

async function loadTeamPageData(id: string, filters: { seasonId?: string; round?: number; period?: 'all' | '30d' | '90d' } = {}) {
  const supabase = createPublicClient()
  const [{ data: team, error: teamError }, { data: seasons, error: seasonsError }] = await Promise.all([
    supabase.from('teams').select('id,name,city,logo_url,is_esi').eq('id', id).maybeSingle(),
    supabase.from('seasons').select('id,name,is_current,starts_on,ends_on').order('starts_on', { ascending: false }),
  ])
  if (teamError || seasonsError) throw teamError ?? seasonsError
  if (!team) return null
  const seasonList = seasons ?? []
  const season = seasonList.find((item) => item.id === filters.seasonId)
    ?? seasonList.find((item) => item.is_current)
    ?? seasonList[0]

  let matchQuery = supabase.from('matches').select(MATCH_SELECT)
    .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
    .order('scheduled_at', { ascending: true })
  if (season) matchQuery = matchQuery.eq('season_id', season.id)
  const { data: matchData } = season ? await matchQuery : { data: [] }
  const matches = (matchData as unknown as MatchRow[]) ?? []
  const allCompletedMatches = matches.filter((match) => match.status === 'termine'
    && match.home_score !== null && match.away_score !== null && match.home_score !== match.away_score)
  const cutoff = filters.period === '30d' ? Date.now() - 30 * 86400000
    : filters.period === '90d' ? Date.now() - 90 * 86400000 : null
  const roundMatches = (match: MatchRow) => filters.round === undefined || match.round_number === filters.round
  const inPeriod = (match: MatchRow) => cutoff === null || new Date(match.scheduled_at).getTime() >= cutoff
  const completedMatches = allCompletedMatches.filter((match) => roundMatches(match) && inPeriod(match))
  const completedIds = completedMatches.map((match) => match.id)

  const [{ data: teamStats }, { data: players }] = await Promise.all([
    completedIds.length
      ? supabase.from('match_team_stats')
        .select('match_id,team_id,points,rebounds,assists,steals,blocks,turnovers,personal_fouls,fg_made,fg_attempted,three_made,three_attempted,ft_made,ft_attempted,published_at')
        .eq('team_id', id).in('match_id', completedIds).not('published_at', 'is', null)
      : Promise.resolve({ data: [] }),
    team.is_esi
      ? supabase.from('players').select('id,first_name,last_name,jersey_number,position,photo_url,status').eq('team_id', id).order('jersey_number')
      : Promise.resolve({ data: [] }),
  ])

  const playerIds = (players ?? []).map((player) => player.id)
  const { data: rawPlayerStats } = completedIds.length && playerIds.length
    ? await supabase.from('match_player_stats')
      .select('id,match_id,player_id,minutes_played,points,rebounds,rebounds_defensive,rebounds_offensive,assists,steals,blocks,turnovers,personal_fouls,fg_made,fg_attempted,three_made,three_attempted,ft_made,ft_attempted,published_at')
      .in('match_id', completedIds).in('player_id', playerIds).not('published_at', 'is', null)
    : { data: [] }

  const playersById = new Map((players ?? []).map((player) => [player.id, player]))
  const playerStats = (rawPlayerStats ?? []).flatMap((stat) => {
    const player = playersById.get(stat.player_id)
    return player ? [{ ...stat, player }] : []
  }) as PlayerSeasonStat[]

  return {
    team: team as Team,
    season: season ? { id: season.id, name: season.name } : null,
    seasons: seasonList.map(({ id: seasonKey, name }) => ({ id: seasonKey, name })),
    matches,
    seasonCompletedMatches: allCompletedMatches.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    completedMatches: completedMatches.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    upcomingMatches: matches.filter((match) => match.status !== 'termine' && roundMatches(match)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    teamStats: (teamStats ?? []) as TeamSeasonStat[],
    players: players ?? [],
    playerStats,
  }
}

export type TeamPageData = NonNullable<Awaited<ReturnType<typeof loadTeamPageData>>>

async function loadRoster(): Promise<Player[]> {
  const supabase = createPublicClient()
  const { data: esi, error: esiError } = await supabase.from('teams').select('id').eq('is_esi', true).maybeSingle()
  if (esiError) throw esiError
  if (!esi) return []
  const { data, error } = await supabase
    .from('players').select('id, first_name, last_name, jersey_number, position, photo_url, status')
    .eq('team_id', esi.id)
    .order('jersey_number', { ascending: true })
  if (error) throw error
  return data ?? []
}

export type PublishedNews = {
  id: string
  title: string
  excerpt: string | null
  body: string
  category: string | null
  cover_url: string | null
  published_at: string | null
}

async function loadPublishedNews(limit = 9): Promise<PublishedNews[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.from('news')
    .select('id,title,excerpt,body,category,cover_url,published_at')
    .eq('is_published', true).not('published_at', 'is', null)
    .order('published_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 30))
  // No news table (PGRST205): the site shows its fallback news, cached like any result.
  if (error?.code === 'PGRST205') return []
  if (error) throw error
  return (data ?? []) as PublishedNews[]
}

/** Un match terminé de l'ESI dans la saison : sert à choisir une journée sur la fiche joueur. */
export type SeasonJourney = {
  matchId: string
  round: number | null
  scheduledAt: string
  opponent: string
  esiScore: number | null
  opponentScore: number | null
}

type JourneySource = {
  id: string
  scheduled_at: string
  round_number: number | null
  home_score: number | null
  away_score: number | null
  home_team: { name: string; is_esi: boolean }
  away_team: { name: string; is_esi: boolean }
}

function toJourney(match: JourneySource): SeasonJourney | null {
  const esiHome = match.home_team.is_esi
  if (!esiHome && !match.away_team.is_esi) return null
  const opponent = esiHome ? match.away_team : match.home_team
  return {
    matchId: match.id,
    round: match.round_number,
    scheduledAt: match.scheduled_at,
    opponent: opponent.is_esi ? 'ESI' : opponent.name,
    esiScore: esiHome ? match.home_score : match.away_score,
    opponentScore: esiHome ? match.away_score : match.home_score,
  }
}

/** Matchs terminés de l'ESI dans la saison. Facultatif : la fiche marche sans. */
async function getEsiJourneys(supabase: ReturnType<typeof createPublicClient>, seasonId: string): Promise<SeasonJourney[]> {
  const rows = await optionalData<MatchRow[]>(
    supabase.from('matches').select(MATCH_SELECT).eq('season_id', seasonId).eq('status', 'termine') as unknown as PromiseLike<{ data: MatchRow[] | null }>)
  return (rows ?? []).flatMap((match) => toJourney(match) ?? [])
}


async function loadPlayerProfile(id: string, filters: { seasonId?: string; round?: number; period?: 'all' | '30d' | '90d' } = {}) {
  const supabase = createPublicClient()
  const [{ data: player, error: playerError }, { data: seasonRows }, { data: allStats }] = await Promise.all([
    supabase.from('players').select('id, first_name, last_name, jersey_number, position, photo_url, status, team_id').eq('id', id).maybeSingle(),
    supabase.from('seasons').select('id,name,is_current').order('starts_on', { ascending: false }),
    supabase.from('match_player_stats')
      .select('id,match_id,minutes_played,points,rebounds,rebounds_defensive,rebounds_offensive,assists,steals,blocks,turnovers,personal_fouls,fg_made,fg_attempted,three_made,three_attempted,ft_made,ft_attempted,published_at,match:matches(id,scheduled_at,status,home_score,away_score,round_number,season_id,home_team:teams!matches_home_team_id_fkey(id,name,is_esi),away_team:teams!matches_away_team_id_fkey(id,name,is_esi))')
      .eq('player_id', id).not('published_at', 'is', null)
      .order('created_at', { ascending: false }),
  ])
  if (playerError) throw playerError
  if (!player) return null
  const seasons = seasonRows ?? []
  const season = seasons.find((item) => item.id === filters.seasonId)
    ?? seasons.find((item) => item.is_current)
    ?? seasons[0]

  const typedStats = (allStats ?? []) as unknown as PlayerProfileStat[]
  const seasonStats = season ? typedStats
    .filter((stat): stat is PlayerProfileStat & { match: NonNullable<PlayerProfileStat['match']> } => stat.match !== null)
    .filter((stat) => stat.match?.season_id === season.id)
    .sort((a, b) => (b.match?.scheduled_at ?? '').localeCompare(a.match?.scheduled_at ?? '')) : []
  const cutoff = filters.period === '30d' ? Date.now() - 30 * 86400000
    : filters.period === '90d' ? Date.now() - 90 * 86400000 : null
  const stats = seasonStats.filter((stat) => (filters.round === undefined || stat.match?.round_number === filters.round)
    && (cutoff === null || new Date(stat.match?.scheduled_at ?? 0).getTime() >= cutoff))

  // Matches where this player was the official MVP (migration 039). Optional:
  // the profile still works if the column is unavailable.
  const matchIds = seasonStats.map((stat) => stat.match_id)
  const mvpRows = matchIds.length
    ? await optionalData<{ id: string; mvp_player_id: string | null }[]>(
      supabase.from('matches').select('id,mvp_player_id').in('id', matchIds) as unknown as PromiseLike<{ data: { id: string; mvp_player_id: string | null }[] | null }>)
    : null
  const mvpMatchIds = (mvpRows ?? []).filter((row) => row.mvp_player_id === id).map((row) => row.id)

  // Journées de la saison : les matchs terminés de l'ESI, plus ceux où le joueur a une ligne de stats.
  const journeyById = new Map<string, SeasonJourney>()
  const addJourney = (journey: SeasonJourney | null) => { if (journey && !journeyById.has(journey.matchId)) journeyById.set(journey.matchId, journey) }
  seasonStats.forEach((stat) => addJourney(toJourney(stat.match)))
  if (season) (await getEsiJourneys(supabase, season.id)).forEach(addJourney)
  const journeys = [...journeyById.values()].sort((a, b) =>
    (a.round ?? Number.MAX_SAFE_INTEGER) - (b.round ?? Number.MAX_SAFE_INTEGER) || a.scheduledAt.localeCompare(b.scheduledAt))

  return {
    player, season: season ? { id: season.id, name: season.name } : null,
    seasons: seasons.map(({ id: seasonKey, name }) => ({ id: seasonKey, name })),
    seasonStats, stats, mvpMatchIds, journeys,
  }
}

/*
 * Public reads are cached for 60 s and shared by every visitor: with 10 or
 * 1000 visitors the database sees about the same number of queries. A staff
 * change refreshes them at once (revalidatePublicData). A failed read is never
 * cached: the page falls back to its empty state, as before.
 */
const PUBLIC_REVALIDATE_SECONDS = 60

function cachedRead<A extends unknown[], R>(name: string, load: (...args: A) => Promise<R>, fallback: { value: R } | null) {
  const cached = unstable_cache(load, ['public-data', name], { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [PUBLIC_DATA_TAG] })
  return async (...args: A): Promise<R> => {
    try {
      return await cached(...args)
    } catch (error) {
      if (!fallback) throw error
      console.error(`[public-data] ${name} unavailable`, error instanceof Error ? error.message : (error as { code?: string })?.code ?? 'unknown')
      return fallback.value
    }
  }
}

export const getNextMatch = cachedRead('next-match', loadNextMatch, { value: null })
export const getLastResult = cachedRead('last-result', loadLastResult, { value: null })
export const getMatchesPage = cachedRead('matches-page', loadMatchesPage, null)
export const getMatchById = cachedRead('match', loadMatchById, { value: null })
export const getStandings = cachedRead('standings', loadStandings, { value: [] })
export const getTeams = cachedRead('teams', loadTeams, { value: [] })
export const getTeamPageData = cachedRead('team-page', loadTeamPageData, { value: null })
export const getRoster = cachedRead('roster', loadRoster, { value: [] })
export const getPublishedNews = cachedRead('news', loadPublishedNews, { value: [] })
export const getPlayerProfile = cachedRead('player-profile', loadPlayerProfile, { value: null })
