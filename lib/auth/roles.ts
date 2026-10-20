import type { Site } from '@/lib/sites'

export type AppRole =
  | 'coach' | 'coach_adjoint' | 'statisticienne' | 'admin' | 'joueur'

// Route d'accueil de chaque rôle après connexion.
export const HOME_SITE: Record<AppRole, Site> = {
  coach: 'coach',
  coach_adjoint: 'adjoint',
  statisticienne: 'stats',
  admin: 'admin',
  joueur: 'joueurs',
}

// Routes auxquelles un rôle a accès. L'admin (coach principal) accède à tout.
export function allowedSites(role: AppRole): Site[] {
  if (role === 'admin') return ['admin', 'coach', 'stats', 'joueurs']
  return [HOME_SITE[role]]
}

// RB-AUTH-001 : une seule session active pour le staff de direction
export function isSingleSessionRole(role: AppRole): boolean {
  return role === 'coach' || role === 'admin'
}

export type CurrentUserProfile = {
  role: AppRole
  first_name: string
  last_name: string
  team_id: string | null
  person_id: string
}

type RpcLookup = {
  rpc: (name: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>
}

const APP_ROLES: AppRole[] = ['coach', 'coach_adjoint', 'statisticienne', 'admin', 'joueur']

export async function getCurrentUserProfile(client: unknown): Promise<CurrentUserProfile | null> {
  const db = client as RpcLookup
  const { data, error } = await db.rpc('current_user_profile')
  if (error) throw new Error(`Current user profile lookup failed: ${error.message}`)
  if (!data || typeof data !== 'object') return null

  const profile = data as Partial<CurrentUserProfile>
  if (!profile.role || !APP_ROLES.includes(profile.role)) return null
  if (!profile.person_id || !profile.first_name || !profile.last_name) return null

  return {
    role: profile.role,
    first_name: profile.first_name,
    last_name: profile.last_name,
    team_id: profile.team_id ?? null,
    person_id: profile.person_id,
  }
}

