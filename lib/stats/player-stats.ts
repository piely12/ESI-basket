// Calculs de la fiche joueur : une ligne de stats par match, moyennes, ratios.
// Aucune dépendance (ni base de données, ni React) pour pouvoir les tester seuls.

export type RawPlayerStat = {
  points: number | null
  rebounds: number | null
  rebounds_offensive: number | null
  rebounds_defensive: number | null
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
}

export type StatLine = {
  points: number
  rebounds: number
  offensiveRebounds: number
  defensiveRebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number
  fgMade: number
  fgAttempted: number
  twoMade: number
  twoAttempted: number
  threeMade: number
  threeAttempted: number
  ftMade: number
  ftAttempted: number
}

const n = (value: number | null | undefined) => value ?? 0

/** Une ligne de la base devient une ligne de stats sans valeur vide. */
export function toLine(raw: RawPlayerStat): StatLine {
  const offensiveRebounds = n(raw.rebounds_offensive)
  const defensiveRebounds = n(raw.rebounds_defensive)
  const fgMade = n(raw.fg_made)
  const fgAttempted = n(raw.fg_attempted)
  const threeMade = n(raw.three_made)
  const threeAttempted = n(raw.three_attempted)
  return {
    points: n(raw.points),
    rebounds: raw.rebounds ?? offensiveRebounds + defensiveRebounds,
    offensiveRebounds,
    defensiveRebounds,
    assists: n(raw.assists),
    steals: n(raw.steals),
    blocks: n(raw.blocks),
    turnovers: n(raw.turnovers),
    fouls: n(raw.personal_fouls),
    fgMade,
    fgAttempted,
    twoMade: Math.max(0, fgMade - threeMade),
    twoAttempted: Math.max(0, fgAttempted - threeAttempted),
    threeMade,
    threeAttempted,
    ftMade: n(raw.ft_made),
    ftAttempted: n(raw.ft_attempted),
  }
}

export const emptyLine = (): StatLine => toLine({
  points: 0, rebounds: 0, rebounds_offensive: 0, rebounds_defensive: 0, assists: 0, steals: 0, blocks: 0,
  turnovers: 0, personal_fouls: 0, fg_made: 0, fg_attempted: 0, three_made: 0, three_attempted: 0, ft_made: 0, ft_attempted: 0,
})

export function sumLines(lines: readonly StatLine[]): StatLine {
  const total = emptyLine()
  for (const line of lines) {
    for (const key of Object.keys(total) as (keyof StatLine)[]) total[key] += line[key]
  }
  return total
}

/** « 13,5 » : une décimale, virgule française. */
export function formatAverage(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',')
}

/** Pourcentage entier, ou null quand il n'y a aucune tentative. */
export function percentOf(made: number, attempted: number): number | null {
  return attempted > 0 ? Math.round((made / attempted) * 100) : null
}
