// Espaces privés servis sous forme de routes sur l'origine principale.
export const SITES = ['coach', 'stats', 'actus', 'joueurs', 'admin'] as const
export type Site = (typeof SITES)[number]

// Chemins publics ou API partagés, sans garde d'accès à un espace privé.
export const SHARED_PATHS = ['/login', '/connexion', '/mot-de-passe-oublie', '/acces-refuse', '/auth', '/api']
