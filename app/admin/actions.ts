'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { isIP } from 'node:net'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAccountReadyEmail } from '@/lib/auth/brevo'
import { requireRole } from '@/lib/auth/requireUser'
import { audit, consumeRateLimit, rlKey } from '@/lib/security'
import { isValidEmail, validateNewPassword } from '@/lib/validation'

export type AdminActionState = { error: string; success: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PLAYER_STATUSES = ['actif', 'blesse', 'suspendu'] as const
type PlayerStatus = (typeof PLAYER_STATUSES)[number]
const PLAYER_STATUS_FORM = z.object({
  player_id: z.string().regex(UUID),
  status: z.enum(PLAYER_STATUSES),
}).strict()
const ACCOUNT_FORM = z.object({
  profile_ref: z.string().regex(/^(joueur|staff):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  mode: z.enum(['creer', 'lier']),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().max(128),
}).strict()

async function checkAdminRateLimit(admin: ReturnType<typeof createAdminClient>, actorId: string, action: string) {
  const requestHeaders = await headers()
  const rawIp = requestHeaders.get('x-real-ip')?.trim() ?? ''
  const ip = isIP(rawIp) ? rawIp.toLowerCase() : 'unknown'
  const config = action === 'account' ? { limit: 5, window: 60 * 60, ipLimit: 20 } : { limit: 30, window: 60, ipLimit: 120 }
  const [actor, address] = await Promise.all([
    consumeRateLimit(admin, rlKey(`admin-${action}`, actorId), config.limit, config.window),
    consumeRateLimit(admin, rlKey(`admin-${action}-ip`, ip), config.ipLimit, config.window),
  ])
  return actor.allowed && address.allowed
}

async function getAdminContext() {
  const { user } = await requireRole('admin')

  const admin = createAdminClient()
  const { data: team, error } = await admin.from('teams').select('id').eq('is_esi', true).maybeSingle()
  if (error || !team) return null

  return { admin, userId: user.id, teamId: team.id }
}

function result(error: string, success = ''): AdminActionState {
  return { error, success }
}

export async function createOrLinkAccount(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const context = await getAdminContext()
  if (!context) return result('Session expirée ou accès administrateur requis.')

  const input = ACCOUNT_FORM.safeParse({
    profile_ref: formData.get('profile_ref'),
    mode: formData.get('mode') ?? 'creer',
    email: formData.get('email'),
    password: formData.get('password') ?? '',
  })
  if (!input.success) return result('Fiche, e-mail ou mode de création invalide.')

  const { admin, userId: actorId, teamId } = context
  try {
    if (!await checkAdminRateLimit(admin, actorId, 'account')) {
      await audit(admin, 'admin_account_rate_limited', actorId)
      return result('Trop de créations. Réessaie plus tard.')
    }
  } catch {
    return result('Service de sécurité indisponible. Réessaie plus tard.')
  }

  const profileRef = input.data.profile_ref
  const [profileType, profileId] = profileRef.split(':')
  const email = input.data.email
  const mode = input.data.mode
  const password = input.data.password
  if (!isValidEmail(email)) return result('Entrez une adresse e-mail valide.')
  if (mode === 'creer') {
    const passwordError = validateNewPassword(password, email)
    if (passwordError) return result(`Mot de passe initial : ${passwordError}`)
  }

  let targetName = ''
  let targetRole: string | null = null
  let linkedUserId: string | null = null

  if (profileType === 'joueur') {
    const { data: player, error } = await admin.from('players')
      .select('id, user_id, first_name, last_name')
      .eq('id', profileId).eq('team_id', teamId).maybeSingle()
    if (error || !player) return result('Cette fiche joueur est introuvable dans l’effectif ESI.')
    targetName = `${player.first_name} ${player.last_name}`
    linkedUserId = player.user_id
  } else {
    const { data: staff, error } = await admin.from('staff')
      .select('id, user_id, first_name, last_name, role')
      .eq('id', profileId).eq('team_id', teamId).maybeSingle()
    if (error || !staff) return result('Cette fiche staff est introuvable dans l’équipe ESI.')
    if (staff.role === 'admin') return result('Le rattachement d’un compte administrateur doit être fait par une procédure dédiée.')
    targetName = `${staff.first_name} ${staff.last_name}`
    targetRole = staff.role
    linkedUserId = staff.user_id
  }

  if (linkedUserId) return result('Cette fiche possède déjà un compte associé.')

  let authUserId: string
  let createdNewUser = false
  if (mode === 'lier') {
    const { data: users, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) return result('Impossible de rechercher les comptes Auth existants.')
    const matches = users.users.filter((user) => user.email?.toLowerCase() === email)
    if (matches.length !== 1) return result('Aucun compte Auth unique trouvé avec cet e-mail. Crée le compte ou vérifie l’adresse saisie.')
    authUserId = matches[0].id

    const [{ data: linkedPlayer, error: playerLinkError }, { data: linkedStaff, error: staffLinkError }] = await Promise.all([
      admin.from('players').select('id').eq('user_id', authUserId).maybeSingle(),
      admin.from('staff').select('id').eq('user_id', authUserId).maybeSingle(),
    ])
    if (playerLinkError || staffLinkError) return result('Impossible de vérifier les rattachements existants.')
    if (linkedPlayer || linkedStaff) return result('Ce compte est déjà rattaché à une autre fiche.')
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: targetName.split(' ')[0], account_created_by_admin: true },
    })
    if (error || !created.user) {
      return result('Impossible de créer ce compte. Vérifie que l’adresse e-mail n’est pas déjà utilisée.')
    }
    authUserId = created.user.id
    createdNewUser = true
  }

  const table = profileType === 'joueur' ? 'players' : 'staff'
  const { data: linked, error: linkError } = await admin.from(table)
    .update({ user_id: authUserId })
    .eq('id', profileId).eq('team_id', teamId).is('user_id', null)
    .select('id').maybeSingle()

  if (linkError || !linked) {
    if (createdNewUser) await admin.auth.admin.deleteUser(authUserId)
    return result('Le rattachement a échoué. Actualise la page puis réessaie.')
  }

  const { data: securityRow, error: securityError } = await admin.from('users')
    .update({ must_change_password: true, password_changed_at: null })
    .eq('id', authUserId).select('id').maybeSingle()
  if (securityError || !securityRow) {
    await admin.from(table).update({ user_id: null }).eq('id', profileId).eq('user_id', authUserId)
    if (createdNewUser) await admin.auth.admin.deleteUser(authUserId)
    return result('Impossible d’activer la première connexion. Vérifie les migrations de sécurité.')
  }

  await audit(admin, createdNewUser ? 'admin_created_account' : 'admin_account_linked', actorId, {
    metadata: { profile_type: profileType, profile_id: profileId, role: targetRole, method: mode },
  })
  after(async () => {
    try {
      await sendAccountReadyEmail(email, targetName.split(' ')[0] || 'membre')
      await audit(admin, 'admin_account_notification_sent', actorId, {
        metadata: { profile_type: profileType, profile_id: profileId },
      })
    } catch {
      await audit(admin, 'admin_account_notification_failed', actorId, {
        metadata: { profile_type: profileType, profile_id: profileId },
      })
    }
  })
  revalidatePath('/admin')
  return result('', `Le compte ${email} est associé à ${targetName}.`)
}

export async function updatePlayerStatus(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const context = await getAdminContext()
  if (!context) return result('Session expirée ou accès administrateur requis.')

  const parsed = PLAYER_STATUS_FORM.safeParse({
    player_id: formData.get('player_id'),
    status: formData.get('status'),
  })
  if (!parsed.success) {
    return result('Joueur ou disponibilité invalide.')
  }
  const { player_id: playerId, status } = parsed.data

  const { admin, userId: actorId, teamId } = context
  try {
    if (!await checkAdminRateLimit(admin, actorId, 'status')) {
      await audit(admin, 'admin_player_status_rate_limited', actorId)
      return result('Trop de modifications. Réessaie plus tard.')
    }
  } catch {
    return result('Service de sécurité indisponible. Réessaie plus tard.')
  }
  const { data: player, error } = await admin.from('players')
    .update({ status: status as PlayerStatus })
    .eq('id', playerId).eq('team_id', teamId)
    .select('id, first_name, last_name').maybeSingle()
  if (error || !player) return result('Impossible de mettre à jour ce joueur.')

  await audit(admin, 'admin_player_status_updated', actorId, {
    metadata: { player_id: playerId, status },
  })
  revalidatePath('/admin')
  revalidatePath('/coach')
  revalidatePath('/coach/equipe')
  revalidatePath('/equipe')
  return result('', `Disponibilité de ${player.first_name} ${player.last_name} mise à jour.`)
}
