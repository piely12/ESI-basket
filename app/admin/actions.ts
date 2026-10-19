'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { isIP } from 'node:net'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAccountReadyEmail } from '@/lib/auth/brevo'
import { generateOtp, hashOtp, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from '@/lib/auth/otp'
import { requireRole } from '@/lib/auth/requireUser'
import { audit, consumeRateLimit, rlKey } from '@/lib/security'
import { isValidEmail } from '@/lib/validation'

export type AdminActionState = { error: string; success: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ACCOUNT_FORM = z.object({
  profile_ref: z.string().regex(/^(joueur|staff):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  mode: z.enum(['creer', 'lier']),
  email: z.string().trim().toLowerCase().email().max(254),
}).strict()
const COACH_PROFILE_FORM = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
}).strict()

async function checkAdminRateLimit(admin: ReturnType<typeof createAdminClient>, actorId: string, action: string) {
  const requestHeaders = await headers()
  const rawIp = requestHeaders.get('x-real-ip')?.trim() ?? ''
  const ip = isIP(rawIp) ? rawIp.toLowerCase() : 'unknown'
  const config = { limit: 30, window: 60, ipLimit: 120 }
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

async function issueInvitationOtp(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const code = generateOtp()
  const { data, error } = await admin.rpc('issue_recovery_otp', {
    p_user_id: userId,
    p_code_hash: hashOtp(userId, code),
    p_expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    p_max_attempts: OTP_MAX_ATTEMPTS,
  })
  if (error || !data) throw new Error('Invitation OTP could not be issued')
  return code
}

function revalidateAdmin() {
  revalidatePath('/admin')
  revalidatePath('/admin/staff')
  revalidatePath('/admin/joueurs')
  revalidatePath('/admin/journal')
}

export async function createHeadCoachProfile(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const context = await getAdminContext()
  if (!context) return result('Session expirée ou accès administrateur requis.')
  const parsed = COACH_PROFILE_FORM.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
  })
  if (!parsed.success) return result('Indique le prénom et le nom du coach principal.')
  const { admin, userId, teamId } = context
  try {
    if (!await checkAdminRateLimit(admin, userId, 'coach-profile-create')) return result('Trop de modifications. Réessaie plus tard.')
  } catch {
    return result('Service de sécurité indisponible. Réessaie plus tard.')
  }
  const { data: existing, error: lookupError } = await admin.from('staff')
    .select('id,user_id').eq('team_id', teamId).eq('role', 'coach').limit(1).maybeSingle()
  if (lookupError) return result('Impossible de vérifier la fiche du coach principal.')
  if (existing) return result(existing.user_id
    ? 'Une fiche coach est déjà rattachée à un compte.'
    : 'La fiche du coach existe déjà. Tu peux maintenant lui créer un compte invité.')

  const { data: created, error } = await admin.from('staff').insert({
    team_id: teamId,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    role: 'coach',
  }).select('id').maybeSingle()
  if (error || !created) return result('Impossible de créer la fiche du coach principal.')
  await audit(admin, 'admin_created_head_coach_profile', userId, {
    metadata: { profile_id: created.id, team_id: teamId },
  })
  revalidateAdmin()
  return result('', 'Fiche du coach créée. Tu peux maintenant lui créer un compte invité et envoyer son code.')
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
  })
  if (!input.success) return result('Fiche, e-mail ou mode de création invalide.')

  const { admin, userId: actorId, teamId } = context
  try {
    if (!await checkAdminRateLimit(admin, actorId, 'account-create')) return result('Trop de modifications. Réessaie plus tard.')
  } catch {
    return result('Service de sécurité indisponible. Réessaie plus tard.')
  }

  const profileRef = input.data.profile_ref
  const [profileType, profileId] = profileRef.split(':')
  const email = input.data.email
  const mode = input.data.mode
  if (!isValidEmail(email)) return result('Entrez une adresse e-mail valide.')

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
    if (['coach', 'statisticienne'].includes(staff.role)) {
      const { data: sameRoleProfiles, error: roleLookupError } = await admin.from('staff')
        .select('id, user_id').eq('team_id', teamId).eq('role', staff.role).neq('id', profileId)
      if (roleLookupError) return result('Impossible de vérifier les comptes du rôle sélectionné.')
      const otherUserIds = (sameRoleProfiles ?? []).map((entry) => entry.user_id).filter((id): id is string => !!id)
      if (otherUserIds.length) {
        const { data: activeRoleAccounts, error: stateLookupError } = await admin.from('users')
          .select('id').in('id', otherUserIds).eq('is_active', true)
        if (stateLookupError) return result('Impossible de vérifier les comptes du rôle sélectionné.')
        if (activeRoleAccounts?.length) return result('Un compte actif existe déjà pour ce rôle. Annule d’abord son rattachement avant d’en associer un autre.')
      }
    }
  }

  if (linkedUserId) return result('Annule d’abord le rattachement existant avant d’attribuer une autre adresse.')

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
      // Supabase Auth requires a credential at account creation. This random
      // secret is server-only and is replaced when the recipient completes OTP.
      password: randomBytes(32).toString('base64url'),
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
  let linkQuery = admin.from(table).update({ user_id: authUserId })
    .eq('id', profileId).eq('team_id', teamId)
  linkQuery = linkQuery.is('user_id', null)
  const { data: linked, error: linkError } = await linkQuery.select('id').maybeSingle()

  if (linkError || !linked) {
    if (createdNewUser) await admin.auth.admin.deleteUser(authUserId)
    return result('Le rattachement a échoué. Actualise la page puis réessaie.')
  }

  const { data: securityRow, error: securityError } = await admin.from('users')
    .update({ is_active: false, must_change_password: true, password_changed_at: null, suspension_reason: null })
    .eq('id', authUserId).select('id').maybeSingle()
  if (securityError || !securityRow) {
    await admin.from(table).update({ user_id: linkedUserId }).eq('id', profileId).eq('user_id', authUserId)
    if (createdNewUser) await admin.auth.admin.deleteUser(authUserId)
    return result('Impossible d’activer la première connexion. Vérifie les migrations de sécurité.')
  }

  await audit(admin, createdNewUser ? 'admin_created_account' : 'admin_account_linked', actorId, {
    metadata: { profile_type: profileType, profile_id: profileId, role: targetRole, method: mode },
  })
  try {
    const code = await issueInvitationOtp(admin, authUserId)
    await sendAccountReadyEmail(email, targetName.split(' ')[0] || 'membre', code)
    await audit(admin, 'admin_account_notification_sent', actorId, {
      metadata: { profile_type: profileType, profile_id: profileId },
    })
  } catch {
    await audit(admin, 'admin_account_notification_failed', actorId, {
      metadata: { profile_type: profileType, profile_id: profileId },
    })
    revalidateAdmin()
    return result(`Le compte est rattaché, mais l’e-mail d’invitation n’a pas été envoyé à ${email}. Vérifie la configuration Brevo et l’URL publique, puis renvoie l’invitation.`)
  }
  revalidateAdmin()
  return result('', `Compte créé pour ${targetName}. L’e-mail envoyé à ${email} contient le code et le lien pour choisir son mot de passe.`)
}

const REF_FORM = z.object({
  profile_ref: z.string().regex(/^(joueur|staff):[0-9a-f-]{36}$/i),
}).strict()
const ACCESS_FORM = z.object({
  user_id: z.string().regex(UUID),
  action: z.enum(['suspendre', 'reactiver']),
  reason: z.string().trim().max(500).optional().default(''),
  confirm: z.literal('yes'),
}).strict()

async function resolveProfileRef(admin: ReturnType<typeof createAdminClient>, teamId: string, ref: string) {
  const [kind, id] = ref.split(':')
  if (kind === 'joueur') {
    const { data, error } = await admin.from('players').select('id, user_id, first_name, last_name')
      .eq('id', id).eq('team_id', teamId).maybeSingle()
    if (error || !data) return null
    return { kind, id: data.id, userId: data.user_id, name: `${data.first_name} ${data.last_name}`, role: 'joueur' }
  }
  if (kind === 'staff') {
    const { data, error } = await admin.from('staff').select('id, user_id, first_name, last_name, role')
      .eq('id', id).eq('team_id', teamId).maybeSingle()
    if (error || !data || data.role === 'admin') return null
    return { kind, id: data.id, userId: data.user_id, name: `${data.first_name} ${data.last_name}`, role: data.role }
  }
  return null
}

async function sendInvitationForProfile(ref: string, actorId: string) {
  const context = await getAdminContext()
  if (!context) return result('Session expirée ou accès administrateur requis.')
  const { admin, teamId } = context
  try {
    if (!await checkAdminRateLimit(admin, actorId, 'account-invite')) return result('Trop de modifications. Réessaie plus tard.')
  } catch {
    return result('Service de sécurité indisponible. Réessaie plus tard.')
  }
  const profile = await resolveProfileRef(admin, teamId, ref)
  if (!profile?.userId) return result('Aucun compte rattaché à cette fiche.')
  const { data: access, error } = await admin.from('users').select('is_active, must_change_password')
    .eq('id', profile.userId).maybeSingle()
  if (error || !access || access.is_active || !access.must_change_password) {
    return result('Cette fiche n’a pas d’invitation en attente.')
  }
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(profile.userId)
  if (authError || !authData.user?.email) return result('Adresse e-mail du compte indisponible.')
  try {
    const code = await issueInvitationOtp(admin, profile.userId)
    await sendAccountReadyEmail(authData.user.email, profile.name.split(' ')[0] || 'membre', code)
    await audit(admin, 'admin_invitation_resent', actorId, { metadata: { profile_id: profile.id, profile_type: profile.kind } })
    await audit(admin, 'admin_invitation_delivery_succeeded', actorId, { metadata: { profile_id: profile.id } })
  } catch {
    await audit(admin, 'admin_invitation_delivery_failed', actorId, { metadata: { profile_id: profile.id } })
    return result(`L’e-mail d’invitation n’a pas pu être envoyé à ${authData.user.email}. Vérifie Brevo et l’URL publique, puis réessaie.`)
  }
  revalidateAdmin()
  return result('', `Invitation envoyée à ${authData.user.email}. Le message contient le code et le lien de connexion.`)
}

export async function resendInvitation(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const parsed = REF_FORM.safeParse({ profile_ref: formData.get('profile_ref') })
  if (!parsed.success) return result('Fiche invalide.')
  const { user } = await requireRole('admin')
  return sendInvitationForProfile(parsed.data.profile_ref, user.id)
}

export async function cancelAccountBinding(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  if (formData.get('confirm') !== 'yes') return result('Confirme l’annulation du rattachement.')
  const parsed = REF_FORM.safeParse({ profile_ref: formData.get('profile_ref') })
  if (!parsed.success) return result('Fiche invalide.')
  const context = await getAdminContext()
  if (!context) return result('Session expirée ou accès administrateur requis.')
  const { admin, teamId, userId: actorId } = context
  try {
    if (!await checkAdminRateLimit(admin, actorId, 'account-access')) return result('Trop de modifications. Réessaie plus tard.')
  } catch {
    return result('Service de sécurité indisponible. Réessaie plus tard.')
  }
  const profile = await resolveProfileRef(admin, teamId, parsed.data.profile_ref)
  if (!profile?.userId) return result('Aucun compte n’est rattaché à cette fiche.')
  const [{ data: access, error: accessError }, { data: authData, error: authError }, { data: otherPlayers, error: playerError }, { data: otherStaff, error: staffError }] = await Promise.all([
    admin.from('users').select('is_active, must_change_password').eq('id', profile.userId).maybeSingle(),
    admin.auth.admin.getUserById(profile.userId),
    admin.from('players').select('id').eq('team_id', teamId).eq('user_id', profile.userId).neq('id', profile.kind === 'joueur' ? profile.id : '00000000-0000-0000-0000-000000000000'),
    admin.from('staff').select('id').eq('team_id', teamId).eq('user_id', profile.userId).neq('id', profile.kind === 'staff' ? profile.id : '00000000-0000-0000-0000-000000000000'),
  ])
  if (accessError || authError || playerError || staffError || !access || !authData.user) {
    return result('Impossible de vérifier le compte et ses autres rattachements.')
  }
  const hasOtherProfile = !!otherPlayers?.length || !!otherStaff?.length
  const accountCreatedByAdmin = authData.user.user_metadata?.account_created_by_admin === true
  const table = profile.kind === 'joueur' ? 'players' : 'staff'
  const { error: unlinkError } = await admin.from(table).update({ user_id: null })
    .eq('id', profile.id).eq('team_id', teamId).eq('user_id', profile.userId)
  if (unlinkError) return result('Impossible d’annuler le rattachement.')

  let authAccountDeleted = false
  if (!hasOtherProfile && accountCreatedByAdmin) {
    const { error } = await admin.auth.admin.deleteUser(profile.userId)
    if (error) {
      await admin.from(table).update({ user_id: profile.userId }).eq('id', profile.id).eq('team_id', teamId).is('user_id', null)
      return result('Le rattachement a été rétabli, car le compte invité n’a pas pu être supprimé.')
    }
    authAccountDeleted = true
  } else if (!hasOtherProfile) {
    const { error } = await admin.from('users').update({
      is_active: false,
      must_change_password: false,
      suspension_reason: null,
    }).eq('id', profile.userId)
    if (error) {
      await admin.from(table).update({ user_id: profile.userId }).eq('id', profile.id).eq('team_id', teamId).is('user_id', null)
      return result('Le rattachement a été rétabli, car le compte n’a pas pu être désactivé.')
    }
  }
  if (!hasOtherProfile) await admin.from('active_sessions').delete().eq('user_id', profile.userId)
  await audit(admin, 'admin_account_binding_cancelled', actorId, {
    metadata: { profile_id: profile.id, profile_type: profile.kind, role: profile.role, target_user_id: profile.userId, auth_account_deleted: authAccountDeleted, remaining_profile_links: hasOtherProfile },
  })
  revalidateAdmin()
  return result('', hasOtherProfile
    ? 'Rattachement annulé pour ' + profile.name + '. Le compte reste actif car il est encore lié à un autre profil.'
    : 'Rattachement annulé pour ' + profile.name + '. Tu peux maintenant associer une autre adresse e-mail.')
}

export async function updateAccountAccess(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const parsed = ACCESS_FORM.safeParse({
    user_id: formData.get('user_id'),
    action: formData.get('action'),
    reason: formData.get('reason') ?? '',
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return result('Action ou motif invalide.')
  if (parsed.data.action === 'suspendre' && parsed.data.reason.length < 5) {
    return result('Le motif doit contenir au moins 5 caractères.')
  }
  const context = await getAdminContext()
  if (!context) return result('Session expirée ou accès administrateur requis.')
  const { admin, teamId, userId: actorId } = context
  try {
    if (!await checkAdminRateLimit(admin, actorId, 'account-access')) return result('Trop de modifications. Réessaie plus tard.')
  } catch {
    return result('Service de sécurité indisponible. Réessaie plus tard.')
  }
  const targetId = parsed.data.user_id
  const [{ data: staff }, { data: player }, { data: targetAccess }] = await Promise.all([
    admin.from('staff').select('id, role').eq('team_id', teamId).eq('user_id', targetId).maybeSingle(),
    admin.from('players').select('id').eq('team_id', teamId).eq('user_id', targetId).maybeSingle(),
    admin.from('users').select('is_active, must_change_password').eq('id', targetId).maybeSingle(),
  ])
  if ((!staff && !player) || !targetAccess) return result('Ce compte n’est pas rattaché à l’équipe ESI.')

  if (staff?.role === 'admin' && parsed.data.action === 'suspendre') {
    const { data: admins } = await admin.from('staff').select('user_id').eq('team_id', teamId).eq('role', 'admin').not('user_id', 'is', null)
    const adminIds = (admins ?? []).map((entry) => entry.user_id).filter((id): id is string => !!id)
    const { data: activeAdmins } = await admin.from('users').select('id').in('id', adminIds).eq('is_active', true)
    if ((activeAdmins ?? []).length <= 1) return result('Le dernier compte administrateur actif ne peut pas être suspendu.')
  }
  if (parsed.data.action === 'suspendre' && !targetAccess.is_active) return result('Ce compte n’est pas actif.')
  if (parsed.data.action === 'reactiver' && (targetAccess.is_active || targetAccess.must_change_password)) {
    return result('Ce compte n’est pas suspendu.')
  }

  const suspension = parsed.data.action === 'suspendre'
  const { error } = await admin.from('users').update(suspension ? {
    is_active: false,
    must_change_password: false,
    suspension_reason: parsed.data.reason,
  } : {
    is_active: true,
    // Re-activation requires a fresh password confirmation through OTP.
    must_change_password: true,
    suspension_reason: null,
  }).eq('id', targetId)
  if (error) return result('Impossible de modifier les accès de ce compte.')
  await admin.from('active_sessions').delete().eq('user_id', targetId)
  await audit(admin, suspension ? 'admin_account_suspended' : 'admin_account_reactivated', actorId, {
    metadata: { target_user_id: targetId, reason: suspension ? parsed.data.reason : null },
  })
  revalidateAdmin()
  return result('', suspension ? 'Compte suspendu.' : 'Compte réactivé. Une vérification par code sera demandée à sa prochaine connexion.')
}

