// Leaders d'une équipe : classement des joueurs sur une statistique de la saison.
// Calculs purs, sans base de données ni React, pour pouvoir les tester seuls.
import type { StatLine } from './player-stats'

export type LeaderStatKey =
  | 'points' | 'assists' | 'rebounds' | 'blocks' | 'steals'
  | 'fieldGoals' | 'twoPoints' | 'threePoints' | 'freeThrows'

export type LeaderStatDef = { key: LeaderStatKey; label: string; title: string; kind: 'average' | 'shooting' }

// Ordre du menu : d'abord le jeu, ensuite les tirs.
export const LEADER_STATS: LeaderStatDef[] = [
  { key: 'points', label: 'Points', title: 'Meilleurs marqueurs', kind: 'average' },
  { key: 'assists', label: 'Passes décisives', title: 'Meilleurs passeurs', kind: 'average' },
  { key: 'rebounds', label: 'Rebonds', title: 'Meilleurs rebondeurs', kind: 'average' },
  { key: 'blocks', label: 'Contres', title: 'Meilleurs contreurs', kind: 'average' },
  { key: 'steals', label: 'Interceptions', title: 'Meilleurs intercepteurs', kind: 'average' },
  { key: 'fieldGoals', label: 'Paniers', title: 'Meilleurs aux paniers', kind: 'shooting' },
  { key: 'twoPoints', label: '2 points', title: 'Meilleurs à 2 points', kind: 'shooting' },
  { key: 'threePoints', label: '3 points', title: 'Meilleurs à 3 points', kind: 'shooting' },
  { key: 'freeThrows', label: 'Lancers francs', title: 'Meilleurs aux lancers francs', kind: 'shooting' },
]

/** Tentatives minimum pour apparaître dans un classement au pourcentage. */
export const MIN_ATTEMPTS = 5

type AverageKey = 'points' | 'assists' | 'rebounds' | 'blocks' | 'steals'
type ShootingKey = 'fieldGoals' | 'twoPoints' | 'threePoints' | 'freeThrows'
type Shooting = { made: number; attempted: number }

export type LeaderPlayer = {
  id: string
  name: string
  position: string
  games: number
  average: Record<AverageKey, number>
  shooting: Record<ShootingKey, Shooting>
}

/** Résume les lignes de stats d'un joueur. Renvoie null s'il n'a joué aucun match. */
export function buildLeaderPlayer(info: { id: string; name: string; position: string }, lines: readonly StatLine[]): LeaderPlayer | null {
  const games = lines.length
  if (!games) return null
  const sum = (pick: (line: StatLine) => number) => lines.reduce((total, line) => total + pick(line), 0)
  return {
    ...info,
    games,
    average: {
      points: sum((line) => line.points) / games,
      assists: sum((line) => line.assists) / games,
      rebounds: sum((line) => line.rebounds) / games,
      blocks: sum((line) => line.blocks) / games,
      steals: sum((line) => line.steals) / games,
    },
    shooting: {
      fieldGoals: { made: sum((line) => line.fgMade), attempted: sum((line) => line.fgAttempted) },
      twoPoints: { made: sum((line) => line.twoMade), attempted: sum((line) => line.twoAttempted) },
      threePoints: { made: sum((line) => line.threeMade), attempted: sum((line) => line.threeAttempted) },
      freeThrows: { made: sum((line) => line.ftMade), attempted: sum((line) => line.ftAttempted) },
    },
  }
}

export type LeaderRow = { player: LeaderPlayer; value: number; made?: number; attempted?: number }

const ratio = (shooting: Shooting) => (shooting.attempted ? shooting.made / shooting.attempted : 0)

/**
 * Top 3 d'une statistique.
 * - Moyennes : classées sur la moyenne par match, départage aux points.
 * - Tirs « made » : classés sur le nombre de réussis, départage au pourcentage.
 * - Tirs « pct » : classés sur le pourcentage (minimum 5 tentatives), départage au nombre de réussis.
 */
export function rankLeaders(players: readonly LeaderPlayer[], stat: LeaderStatKey, mode: 'made' | 'pct', limit = 3): LeaderRow[] {
  const def = LEADER_STATS.find((item) => item.key === stat)
  if (!def) return []

  if (def.kind === 'average') {
    const key = stat as AverageKey
    return [...players]
      .sort((a, b) => b.average[key] - a.average[key] || b.average.points - a.average.points || a.name.localeCompare(b.name, 'fr'))
      .slice(0, limit)
      .map((player) => ({ player, value: player.average[key] }))
  }

  const key = stat as ShootingKey
  const rows = players.map((player) => ({ player, ...player.shooting[key] }))
  const sorted = mode === 'made'
    ? rows.sort((a, b) => b.made - a.made || ratio(b) - ratio(a) || a.player.name.localeCompare(b.player.name, 'fr'))
    : rows.filter((row) => row.attempted >= MIN_ATTEMPTS)
      .sort((a, b) => ratio(b) - ratio(a) || b.made - a.made || a.player.name.localeCompare(b.player.name, 'fr'))
  return sorted.slice(0, limit).map((row) => ({
    player: row.player, value: mode === 'made' ? row.made : ratio(row) * 100, made: row.made, attempted: row.attempted,
  }))
}
