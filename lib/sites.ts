// Sous-domaines de la plateforme -> dossier de routes interne (app/<site>/...)
export const SITES = ['coach', 'stats', 'actus', 'joueurs', 'admin'] as const
export type Site = (typeof SITES)[number]

// Chemins servis tels quels sur tous les hôtes (pas de réécriture, pas de garde)
export const SHARED_PATHS = ['/login', '/mot-de-passe-oublie', '/acces-refuse', '/auth', '/api']

/**
 * Détecte le sous-domaine depuis l'en-tête Host.
 *  coach.esi-basket.ci          -> 'coach'
 *  coach.esi-basket.localhost   -> 'coach'
 *  coach.localhost:3000         -> 'coach'
 *  esi-basket.ci / localhost    -> null (site public)
 */
export function getSiteFromHost(host: string | null): Site | null {
  if (!host) return null
  const hostname = host.split(':')[0].toLowerCase()
  const first = hostname.split('.')[0]
  return (SITES as readonly string[]).includes(first) ? (first as Site) : null
}
