import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireUser'
import { BREVO_DAILY_APP_LIMIT, BREVO_DAILY_WARNING_LIMIT } from '@/lib/auth/brevo'
import { rlKey } from '@/lib/security'

export const STAFF_ROLE_LABELS: Record<string, string> = {
  coach: 'Coach principal',
  coach_adjoint: 'Coach adjoint',
  statisticienne: 'Statisticienne',
  admin: 'Administrateur',
}

export type AccountStatus = 'invité' | 'actif' | 'suspendu'
export type AccountProfile = {
  ref: string
  id: string
  kind: 'staff' | 'joueur'
  name: string
  label: string
  role: string
  email: string | null
  userId: string | null
  status: AccountStatus | 'non rattaché'
  reason: string | null
}

export async function getAdminAccountData() {
  await requireRole('admin')
  const admin = createAdminClient()
  const { data: team, error: teamError } = await admin.from('teams').select('id, name').eq('is_esi', true).maybeSingle()
  if (teamError || !team) throw new Error('Impossible de charger l’équipe ESI.')

  const [playersResult, staffResult, usersResult] = await Promise.all([
    admin.from('players').select('id, user_id, first_name, last_name, jersey_number, position')
      .eq('team_id', team.id).order('jersey_number', { ascending: true }),
    admin.from('staff').select('id, user_id, first_name, last_name, role')
      .eq('team_id', team.id).order('created_at', { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  if (playersResult.error || staffResult.error || usersResult.error) {
    console.error('[admin] Failed to load account profiles', {
      players: playersResult.error?.message,
      staff: staffResult.error?.message,
      auth: usersResult.error?.message,
    })
    throw new Error('Impossible de charger les comptes et profils de l’équipe.')
  }

  const ids = [
    ...(playersResult.data ?? []).map((item) => item.user_id),
    ...(staffResult.data ?? []).map((item) => item.user_id),
  ].filter((id): id is string => !!id)
  const statesResult = ids.length
    ? await admin.from('users').select('id, is_active, must_change_password, suspension_reason').in('id', ids)
    : { data: [], error: null }
  if (statesResult.error) throw new Error('Impossible de charger l’état des comptes.')

  const stateById = new Map((statesResult.data ?? []).map((state) => [state.id, state]))
  const emailById = new Map((usersResult.data.users ?? []).map((user) => [user.id, user.email ?? null]))
  const makeStatus = (userId: string | null): AccountStatus | 'non rattaché' => {
    if (!userId) return 'non rattaché'
    const state = stateById.get(userId)
    if (!state) return 'suspendu'
    if (state.is_active) return 'actif'
    return state.must_change_password ? 'invité' : 'suspendu'
  }

  const players: AccountProfile[] = (playersResult.data ?? []).map((player) => ({
    ref: `joueur:${player.id}`,
    id: player.id,
    kind: 'joueur',
    name: `${player.first_name} ${player.last_name}`,
    label: `N°${player.jersey_number ?? '—'} · ${player.first_name} ${player.last_name}`,
    role: 'joueur',
    email: player.user_id ? emailById.get(player.user_id) ?? null : null,
    userId: player.user_id,
    status: makeStatus(player.user_id),
    reason: player.user_id ? stateById.get(player.user_id)?.suspension_reason ?? null : null,
  }))
  const staff: AccountProfile[] = (staffResult.data ?? []).map((person) => ({
    ref: `staff:${person.id}`,
    id: person.id,
    kind: 'staff',
    name: `${person.first_name} ${person.last_name}`,
    label: `${STAFF_ROLE_LABELS[person.role] ?? person.role} · ${person.first_name} ${person.last_name}`,
    role: person.role,
    email: person.user_id ? emailById.get(person.user_id) ?? null : null,
    userId: person.user_id,
    status: makeStatus(person.user_id),
    reason: person.user_id ? stateById.get(person.user_id)?.suspension_reason ?? null : null,
  }))
  const quotaKey = rlKey('brevo-daily-email', new Date().toISOString().slice(0, 10))
  const { count: mailCount } = await admin.from('rate_limits').select('id', { count: 'exact', head: true }).eq('key', quotaKey)
  return {
    team,
    players,
    staff,
    mailUsage: { sent: mailCount ?? 0, warningAt: BREVO_DAILY_WARNING_LIMIT, limit: BREVO_DAILY_APP_LIMIT },
  }
}
