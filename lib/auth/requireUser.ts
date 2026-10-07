import 'server-only'

import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, HOME_SITE, type AppRole, type CurrentUserProfile } from '@/lib/auth/roles'

export type AuthenticatedContext = {
  user: User
  profile: CurrentUserProfile
  mustChangePassword: boolean
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function requireUser(options: { allowPasswordChange?: boolean } = {}): Promise<AuthenticatedContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, access] = await Promise.all([
    getCurrentUserProfile(supabase).catch(() => null),
    supabase.rpc('current_user_access_state'),
  ])
  const state = access.data as { is_active?: boolean; must_change_password?: boolean } | null
  if (access.error || !state || state.is_active !== true || typeof state.must_change_password !== 'boolean' || !profile) {
    await supabase.auth.signOut({ scope: 'local' })
    redirect('/login')
  }

  if (state.must_change_password) {
    if (!options.allowPasswordChange) redirect('/premiere-connexion')
  } else if (options.allowPasswordChange) {
    redirect(`/${HOME_SITE[profile.role]}`)
  }

  return { user, profile, mustChangePassword: state.must_change_password, supabase }
}

export async function requireRole(role: AppRole) {
  const context = await requireUser()
  if (context.profile.role !== role) redirect('/acces-refuse')
  return context
}

export async function requireAnyRole(roles: readonly AppRole[]) {
  const context = await requireUser()
  if (!roles.includes(context.profile.role)) redirect('/acces-refuse')
  return context
}
