// Profil d'un joueur face à son équipe : cinq axes entre 0 et 1.
// Chaque axe vaut « valeur du joueur / meilleure valeur de l'équipe ».

export type RadarRow = {
  player_id: string
  match_id: string
  points: number | null
  rebounds: number | null
  assists: number | null
  steals: number | null
  blocks: number | null
  fg_made: number | null
  fg_attempted: number | null
}

export type RadarData = { labels: string[]; player: number[]; team: number[] }

export const RADAR_LABELS = ['Points', 'Rebonds', 'Passes', 'Défense', 'Tirs']

const n = (value: number | null) => value ?? 0

function axes(rows: RadarRow[]): number[] {
  const games = rows.length
  const sum = (pick: (row: RadarRow) => number) => rows.reduce((total, row) => total + pick(row), 0)
  const attempted = sum((row) => n(row.fg_attempted))
  return [
    sum((row) => n(row.points)) / games,
    sum((row) => n(row.rebounds)) / games,
    sum((row) => n(row.assists)) / games,
    sum((row) => n(row.steals) + n(row.blocks)) / games,
    attempted ? sum((row) => n(row.fg_made)) / attempted : 0,
  ]
}

/** Renvoie null s'il n'y a pas assez de données pour comparer le joueur à l'équipe. */
export function buildRadar(playerId: string, rows: RadarRow[]): RadarData | null {
  const byPlayer = new Map<string, RadarRow[]>()
  for (const row of rows) byPlayer.set(row.player_id, [...(byPlayer.get(row.player_id) ?? []), row])
  const mine = byPlayer.get(playerId)
  if (!mine || byPlayer.size < 2) return null

  const everyone = [...byPlayer.values()].map(axes)
  const best = RADAR_LABELS.map((_, axis) => Math.max(...everyone.map((values) => values[axis])))
  const share = (value: number, axis: number) => (best[axis] > 0 ? Math.min(1, value / best[axis]) : 0)
  const mean = (axis: number) => everyone.reduce((total, values) => total + values[axis], 0) / everyone.length
  const own = axes(mine)
  return {
    labels: RADAR_LABELS,
    player: own.map(share),
    team: RADAR_LABELS.map((_, axis) => share(mean(axis), axis)),
  }
}
