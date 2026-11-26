// Bilan de saison : calculs d'affichage purs (écarts de points, signe).

/** « +8,8 », « −4 », « 0 » : signe typographique et virgule française. */
export function signed(value: number, decimals = 0): string {
  const text = Math.abs(value).toFixed(decimals).replace('.', ',')
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text}`
  return text
}

export type MarginBar = { x: number; y: number; width: number; height: number; margin: number; centerX: number; valueY: number }
export type MarginChart = { width: number; height: number; zeroY: number; labelY: number; bars: MarginBar[] }

/**
 * Géométrie du graphique « écart de points par match » : barres vers le haut pour une
 * victoire, vers le bas pour une défaite, à l'échelle de l'écart le plus grand.
 */
export function marginChart(margins: readonly number[]): MarginChart {
  const width = 326
  const padding = 12
  const plot = 66
  const top = 26
  const count = Math.max(1, margins.length)
  const slot = (width - padding * 2) / count
  const barWidth = Math.min(40, slot * 0.62)
  const maxUp = Math.max(0, ...margins)
  const maxDown = Math.max(0, ...margins.map((margin) => -margin))
  const scale = plot / Math.max(maxUp, maxDown, 1)
  const zeroY = top + (maxUp > 0 ? maxUp * scale : 8)
  const bottom = zeroY + (maxDown > 0 ? maxDown * scale + 22 : 8)
  const bars = margins.map((margin, index) => {
    const height = Math.max(2, Math.abs(margin) * scale)
    const centerX = padding + slot * index + slot / 2
    const y = margin >= 0 ? zeroY - height : zeroY
    return { x: centerX - barWidth / 2, y, width: barWidth, height, margin, centerX, valueY: margin >= 0 ? y - 6 : y + height + 16 }
  })
  return { width, height: bottom + 24, zeroY, labelY: bottom + 18, bars }
}
