import type { Player } from '@/lib/data/public'

const OFFICIAL_ROSTER: Record<number, Pick<Player, 'first_name' | 'last_name' | 'position'> & { height: string; weight: string }> = {
  0: { first_name: 'KOUASSI', last_name: 'FAMIEN', position: 'Pivot', height: '1M92', weight: '83 KG' },
  1: { first_name: 'AMON', last_name: 'JEAN LOÏC', position: 'Meneur', height: '1M82', weight: '76 KG' },
  2: { first_name: 'BOTCHI', last_name: 'PETHUEL', position: 'Meneur', height: '1M78', weight: '71 KG' },
  3: { first_name: 'NEBIE', last_name: 'ANGE MICHEL', position: 'Meneur', height: '1M75', weight: '74 KG' },
  4: { first_name: 'YOBOUE', last_name: 'MICAEL', position: 'Ailier fort', height: '1M87', weight: '76 KG' },
  5: { first_name: 'MARC', last_name: 'GBAGO', position: 'Ailier', height: '1M90', weight: '94 KG' },
  6: { first_name: 'M’BOUA', last_name: 'SALOMON', position: 'Ailier', height: '1M83', weight: '90 KG' },
  7: { first_name: 'DALOUGOU', last_name: 'CHRIST-ISRAËL', position: 'Arrière', height: '1M83', weight: '74 KG' },
  8: { first_name: 'KOUAMÉ', last_name: 'MIGUEL', position: 'Ailier', height: '1M87', weight: '69 KG' },
  9: { first_name: 'KOCLA', last_name: 'ALEX', position: 'Pivot', height: '1M94', weight: '78 KG' },
  11: { first_name: 'KOUMOIN', last_name: 'PENIEL', position: 'Ailier fort', height: '1M86', weight: '59 KG' },
  12: { first_name: 'KOUAKOU', last_name: 'DE PAUL', position: 'Meneur', height: '1M79', weight: '61 KG' },
  14: { first_name: 'KOUAO', last_name: 'CHRIS-IVANN', position: 'Arrière', height: '1M77', weight: '60 KG' },
  15: { first_name: 'KOUAO', last_name: 'DARRYL', position: 'Pivot', height: '1M88', weight: '80 KG' },
  24: { first_name: 'COULIBALY', last_name: 'IMAD', position: 'Ailier', height: '1M86', weight: '78 KG' },
  25: { first_name: 'KEITA', last_name: 'ALMAMY', position: 'Arrière', height: '1M80', weight: '74 KG' },
  33: { first_name: 'KONAN', last_name: 'LOUKOU', position: 'Ailier fort', height: '1M90', weight: '85 KG' },
}

export function playerCardInfo(player: Player) {
  const official = player.jersey_number === null ? undefined : OFFICIAL_ROSTER[player.jersey_number]
  return { ...player, ...(official ?? {}) }
}
