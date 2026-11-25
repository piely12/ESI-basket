// Affiches officielles « MVP du match » (864 × 1080). Fichiers dans /public/mvp/.
// Pour ajouter une affiche : déposer mvp_xxx.webp et mvp_xxx_540.webp dans /public/mvp/
// puis ajouter une ligne « numéro de journée: 'nom du fichier sans extension' ».
// ESI joue un seul match par journée : la journée suffit à retrouver le match.
const MVP_FILES: Record<number, string> = {
  1: 'mvp_j1_amon_loic',
}

export const MVP_WIDTH = 864
export const MVP_HEIGHT = 1080

export function mvpPoster(roundNumber: number | null) {
  const file = roundNumber === null ? undefined : MVP_FILES[roundNumber]
  if (!file) return null
  return {
    src: `/mvp/${file}.webp`,
    srcSet: `/mvp/${file}_540.webp 540w, /mvp/${file}.webp 864w`,
  }
}
