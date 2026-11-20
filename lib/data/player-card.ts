import type { Player } from '@/lib/data/public'

const OFFICIAL_ROSTER: Record<number, Pick<Player, 'first_name' | 'last_name' | 'position'>> = {
  0: { first_name: 'KOUASSI', last_name: 'FAMIEN', position: 'Pivot' },
  1: { first_name: 'AMON', last_name: 'JEAN LOÏC', position: 'Meneur' },
  2: { first_name: 'BOTCHI', last_name: 'PETHUEL', position: 'Meneur' },
  3: { first_name: 'NEBIE', last_name: 'ANGE MICHEL', position: 'Meneur' },
  4: { first_name: 'YOBOUE', last_name: 'MICAEL', position: 'Ailier fort' },
  5: { first_name: 'MARC', last_name: 'GBAGO', position: 'Ailier' },
  6: { first_name: 'M’BOUA', last_name: 'SALOMON', position: 'Ailier' },
  7: { first_name: 'DALOUGOU', last_name: 'CHRIST-ISRAËL', position: 'Arrière' },
  8: { first_name: 'KOUAMÉ', last_name: 'MIGUEL', position: 'Ailier' },
  9: { first_name: 'KOCLA', last_name: 'ALEX', position: 'Pivot' },
  11: { first_name: 'KOUMOIN', last_name: 'PENIEL', position: 'Ailier fort' },
  12: { first_name: 'KOUAKOU', last_name: 'DE PAUL', position: 'Meneur' },
  14: { first_name: 'KOUAO', last_name: 'CHRIS-IVANN', position: 'Arrière' },
  15: { first_name: 'KOUAO', last_name: 'DARRYL', position: 'Pivot' },
  24: { first_name: 'COULIBALY', last_name: 'IMAD', position: 'Ailier' },
  25: { first_name: 'KEITA', last_name: 'ALMAMY', position: 'Arrière' },
  33: { first_name: 'KONAN', last_name: 'LOUKOU', position: 'Ailier fort' },
}

export function playerCardInfo(player: Player) {
  const official = player.jersey_number === null ? undefined : OFFICIAL_ROSTER[player.jersey_number]
  return { ...player, ...(official ?? {}) }
}
