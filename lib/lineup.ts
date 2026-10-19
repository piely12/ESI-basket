export const COURT_SLOTS = [
  { key: 'meneur', label: 'Meneur', courtLabel: 'MENEUR', x: 50, y: 82 },
  { key: 'arriere', label: 'Arrière', courtLabel: 'ARRIÈRE', x: 82, y: 57 },
  { key: 'ailier', label: 'Ailier', courtLabel: 'AILIER', x: 18, y: 57 },
  { key: 'ailier_fort', label: 'Ailier fort', courtLabel: 'AILIER FORT', x: 27, y: 24 },
  { key: 'pivot', label: 'Pivot', courtLabel: 'PIVOT', x: 73, y: 24 },
] as const

export type CourtSlot = (typeof COURT_SLOTS)[number]['key']

export type LineupPlayer = {
  id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position: string | null
  photo_url?: string | null
}

export type LineupEntry = {
  player: LineupPlayer
  is_starter: boolean
  court_slot: CourtSlot | null
}

const positionSlots: Array<[RegExp, CourtSlot]> = [
  [/meneur|point\s*guard|\bpg\b/i, 'meneur'],
  [/arri[eè]re|shooting\s*guard|\bsg\b/i, 'arriere'],
  [/ailier\s*fort|power\s*forward|\bpf\b/i, 'ailier_fort'],
  [/pivot|center|centre|\bc\b/i, 'pivot'],
  [/ailier|small\s*forward|\bsf\b/i, 'ailier'],
]

// Old compositions did not record court slots. Use the player's listed role
// where possible, then fill remaining positions in the maquette's fixed order.
export function resolveStarterSlots(entries: LineupEntry[]) {
  const result = new Map<CourtSlot, LineupEntry>()
  const unassigned: LineupEntry[] = []

  for (const entry of entries.filter((item) => item.is_starter)) {
    if (entry.court_slot && !result.has(entry.court_slot)) {
      result.set(entry.court_slot, entry)
      continue
    }
    const mapped = positionSlots.find(([pattern]) => pattern.test(entry.player.position ?? ''))?.[1]
    if (mapped && !result.has(mapped)) result.set(mapped, entry)
    else unassigned.push(entry)
  }

  const openSlots = COURT_SLOTS.map((slot) => slot.key).filter((key) => !result.has(key))
  unassigned.forEach((entry, index) => {
    if (openSlots[index]) result.set(openSlots[index], entry)
  })

  return result
}
