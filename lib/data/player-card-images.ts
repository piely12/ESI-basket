// Cartes joueurs prêtes à l'emploi (1076 × 780). Fichiers dans /public/cartes/.
// Pour ajouter une carte : déposer carte_xxx.webp et carte_xxx_540.webp dans /public/cartes/
// puis ajouter une ligne « numéro de maillot: 'nom du fichier sans extension' ».
const CARD_FILES: Record<number, string> = {
  0: 'carte_kouassi_famien_1',
  1: 'carte_amon_jean_loic_1',
  2: 'carte_botchi_pethuel_2',
  3: 'carte_nebie_ange_michel_1',
  4: 'carte_yoboue_micael_1',
  5: 'carte_marc_gbago_2',
  6: 'carte_mboua_salomon_1',
  7: 'carte_dalougou_christ_israel_1',
  8: 'carte_kouame_miguel_1',
  9: 'carte_kocla_alex_1',
  11: 'carte_koumoin_peniel_1',
  12: 'carte_kouakou_de_paul_1',
  14: 'carte_kouao_chris_ivann_1',
  15: 'carte_kouao_darryl_1',
  24: 'carte_coulibaly_imad_1',
  25: 'carte_keita_almamy_1',
  33: 'carte_konan_loukou_1',
}

export const CARD_WIDTH = 1076
export const CARD_HEIGHT = 780

// Incrémenter cette valeur quand une carte est remplacée : les fichiers sont servis avec un
// cache d'un an (immutable), le paramètre ?v= force les téléphones à recharger la nouvelle image.
export const CARD_VERSION = 5

/** Visage du joueur (recadré sur sa carte), ou null s'il n'a pas encore de carte. */
export function playerFace(jerseyNumber: number | null) {
  return jerseyNumber !== null && CARD_FILES[jerseyNumber] ? `/visages/visage_${jerseyNumber}.webp` : null
}

export function playerCardImage(jerseyNumber: number | null) {
  const file = jerseyNumber === null ? undefined : CARD_FILES[jerseyNumber]
  if (!file) return null
  const url = (suffix: string) => `/cartes/${file}${suffix}.webp?v=${CARD_VERSION}`
  return {
    full: url(''),
    small: url('_540'),
    srcSet: `${url('_540')} 540w, ${url('_800')} 800w, ${url('')} 1076w`,
    // Version « liste » (page Équipe) : sans taille ni poids, plus légère.
    listSmall: url('_liste_540'),
    listSrcSet: `${url('_liste_540')} 540w, ${url('_liste_800')} 800w`,
  }
}
