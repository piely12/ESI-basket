import type { Player } from '@/lib/data/public'

const OFFICIAL_ROSTER: Record<number, Pick<Player, 'first_name' | 'last_name' | 'position'>> = {
  1: { last_name: 'KOUAME', first_name: 'Miguel', position: 'Meneur / Arrière / Ailier / Ailier fort' },
  2: { last_name: 'KOUAO', first_name: 'Chris-Ivann', position: 'Arrière' },
  3: { last_name: 'KEITA', first_name: 'Almamy', position: 'Arrière' },
  4: { last_name: 'BOTCHI', first_name: 'Pethuel', position: 'Meneur' },
  5: { last_name: 'COULIBALY ZIE', first_name: 'Imad', position: 'Ailier' },
  6: { last_name: 'M’BOUA', first_name: 'Salomon', position: 'Arrière / Ailier' },
  7: { last_name: 'AMON', first_name: 'LOIC-OTHNIEL', position: 'Meneur' },
  8: { last_name: 'GBAGO', first_name: 'Marc', position: 'Ailier' },
  9: { last_name: 'NEBIE', first_name: 'ANGE MICHEL', position: 'Meneur' },
  10: { last_name: 'KOUASSI', first_name: 'Famien', position: 'Pivot' },
  11: { last_name: 'KOUAO', first_name: 'DARRYL JUNIOR', position: 'Pivot' },
  12: { last_name: 'DALOUGOU', first_name: 'CHRIS-ISRAEL', position: 'Arrière' },
  13: { last_name: 'KOCLA KOUAKOU', first_name: 'ALEX', position: 'Ailier fort / Pivot' },
  14: { last_name: 'KONAN LOUKOU', first_name: 'ANGE', position: 'Ailier fort / Pivot' },
  15: { last_name: 'KOUAKOU', first_name: 'VINCENT DE PAUL', position: 'Meneur / Arrière' },
  16: { last_name: 'KOUMOIN', first_name: 'PENIEL', position: 'Ailier / Ailier fort' },
  17: { last_name: 'YOBOUE KOUAME', first_name: 'JEAN LOIS', position: 'Ailier / Ailier fort' },
}

export function playerCardInfo(player: Player) {
  const official = player.jersey_number === null ? undefined : OFFICIAL_ROSTER[player.jersey_number]
  return { ...player, ...(official ?? {}) }
}
