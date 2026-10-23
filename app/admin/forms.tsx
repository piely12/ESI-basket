'use client'

import { useActionState, useState } from 'react'
import {
  cancelAccountBinding,
  createOrLinkAccount,
  createHeadCoachProfile,
  createAssistantCoachProfile,
  resendInvitation,
  updateAccountAccess,
} from './actions'
import type { AccountProfile } from './data'
import type { AdminActionState } from './actions'
import { useRateLimitCooldown } from '@/components/useRateLimitCooldown'

export type AccountTarget = { value: string; label: string }
const INITIAL_ACTION_STATE: AdminActionState = { error: '', success: '' }

const fieldClass = 'mt-1 min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-base text-[var(--ink)] outline-none focus:border-[var(--gold-deep)] focus:ring-2 focus:ring-[var(--gold-500)]/30'
const labelClass = 'text-sm font-semibold text-[var(--ink)]'
const buttonClass = 'min-h-12 rounded-xl bg-maroon-panel px-5 font-semibold text-on-brand transition hover:bg-[var(--maroon-700)] disabled:cursor-wait disabled:bg-[var(--ink-soft)]'

export function AdminAccountForm({ targets }: { targets: AccountTarget[] }) {
  const [cooldown, startCooldown] = useRateLimitCooldown()
  const [state, formAction, pending] = useActionState(async (previous: AdminActionState, formData: FormData) => {
    const next = await createOrLinkAccount(previous, formData)
    if (next.code === 'RATE_LIMITED') startCooldown(next.retryAfterSeconds ?? 0)
    return next
  }, INITIAL_ACTION_STATE)
  const [profileRef, setProfileRef] = useState('')
  const [mode, setMode] = useState('creer')
  const [email, setEmail] = useState('')

  if (targets.length === 0) {
    return <p className="rounded-xl bg-[var(--paper)] p-4 text-sm text-[var(--ink-soft)]">
      Toutes les fiches joueur et staff sont déjà associées à un compte.
    </p>
  }

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="profile-ref" className={labelClass}>Fiche à rattacher</label>
        <select id="profile-ref" name="profile_ref" className={fieldClass} required value={profileRef} onChange={(event) => setProfileRef(event.target.value)}>
          <option value="" disabled>Choisir une fiche</option>
          {targets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="account-mode" className={labelClass}>Compte</label>
        <select id="account-mode" name="mode" className={fieldClass} value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="creer">Créer un compte invité</option>
          <option value="lier">Rattacher un compte existant</option>
        </select>
      </div>
      <div>
        <label htmlFor="account-email" className={labelClass}>Adresse e-mail du compte</label>
        <input id="account-email" name="email" type="email" autoComplete="email" maxLength={254} className={fieldClass} required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <p className="self-center text-sm text-[var(--ink-soft)]">Aucun mot de passe n’est défini ou affiché ici. La personne le choisira après vérification par e-mail.</p>
      <div className="md:col-span-2">
        <p className="mb-3 text-xs text-[var(--ink-soft)]">Une fiche déjà liée doit d’abord être détachée explicitement avant de recevoir une autre adresse e-mail.</p>
        <button type="submit" className={buttonClass} disabled={pending || cooldown > 0}>
          {pending ? 'Enregistrement…' : cooldown > 0 ? `Réessaie dans ${cooldown} s` : 'Enregistrer le compte'}
        </button>
        <p aria-live="polite" role={state.error ? 'alert' : 'status'} className={`mt-3 min-h-5 text-sm ${state.error ? 'text-danger' : 'text-brand'}`}>
          {state.message || state.error || state.success}
        </p>
      </div>
    </form>
  )
}

export function HeadCoachProfileForm() {
  const [state, formAction, pending] = useActionState(createHeadCoachProfile, INITIAL_ACTION_STATE)
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2">
    <div>
      <label htmlFor="head-coach-first-name" className={labelClass}>Prénom du coach principal</label>
      <input id="head-coach-first-name" name="first_name" autoComplete="given-name" maxLength={80} className={fieldClass} required />
    </div>
    <div>
      <label htmlFor="head-coach-last-name" className={labelClass}>Nom du coach principal</label>
      <input id="head-coach-last-name" name="last_name" autoComplete="family-name" maxLength={80} className={fieldClass} required />
    </div>
    <div className="sm:col-span-2">
      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? 'Création…' : 'Créer la fiche du coach'}
      </button>
      <p aria-live="polite" role={state.error ? 'alert' : 'status'} className={`mt-3 min-h-5 text-sm ${state.error ? 'text-danger' : 'text-brand'}`}>
        {state.error || state.success}
      </p>
    </div>
  </form>
}

export function AssistantCoachProfileForm() {
  const [state, formAction, pending] = useActionState(createAssistantCoachProfile, INITIAL_ACTION_STATE)
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2">
    <div><label htmlFor="assistant-first-name" className={labelClass}>Prénom</label><input id="assistant-first-name" name="first_name" autoComplete="given-name" maxLength={80} className={fieldClass} required /></div>
    <div><label htmlFor="assistant-last-name" className={labelClass}>Nom</label><input id="assistant-last-name" name="last_name" autoComplete="family-name" maxLength={80} className={fieldClass} required /></div>
    <div className="sm:col-span-2">
      <button type="submit" className={buttonClass} disabled={pending}>{pending ? 'Création…' : 'Créer la fiche adjoint'}</button>
      <p aria-live="polite" role={state.error ? 'alert' : 'status'} className={`mt-3 min-h-5 text-sm ${state.error ? 'text-danger' : 'text-brand'}`}>{state.error || state.success}</p>
    </div>
  </form>
}

export function ProfileAccountRow({ profile }: { profile: AccountProfile }) {
  const [resendCooldown, startResendCooldown] = useRateLimitCooldown()
  const [resendState, resendAction, resendPending] = useActionState(async (previous: AdminActionState, formData: FormData) => {
    const next = await resendInvitation(previous, formData)
    if (next.code === 'RATE_LIMITED') startResendCooldown(next.retryAfterSeconds ?? 0)
    return next
  }, INITIAL_ACTION_STATE)
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelAccountBinding, INITIAL_ACTION_STATE)
  const [accessState, accessAction, accessPending] = useActionState(updateAccountAccess, INITIAL_ACTION_STATE)
  const badge = profile.status === 'actif' ? 'bg-success-bg text-success'
    : profile.status === 'invité' ? 'bg-warning-bg text-warning' : 'bg-neutral-bg text-neutral-ink'

  return (
    <article className="grid gap-3 border-b border-[var(--line)] py-4 sm:grid-cols-[minmax(0,1fr)_minmax(17rem,auto)] sm:items-center">
      <div className="min-w-0">
        <p className="font-semibold text-[var(--ink)]">{profile.label}</p>
        {profile.kind === 'joueur' && <p className="text-sm text-[var(--ink-soft)]">{profile.name}</p>}
        <p className="break-all text-sm text-[var(--ink-soft)]">{profile.email ?? 'Aucune adresse rattachée'}</p>
        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{profile.status}</span>
        {profile.status === 'suspendu' && profile.reason && <p className="mt-1 text-xs text-[var(--ink-soft)]">Motif : {profile.reason}</p>}
      </div>
      {profile.userId && <div className="flex flex-col gap-2 sm:items-end">
        {profile.status === 'invité' && <>
          <form action={resendAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="profile_ref" value={profile.ref} />
            <button className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" disabled={resendPending || resendCooldown > 0}>{resendPending ? 'Envoi…' : resendCooldown > 0 ? `Réessaie dans ${resendCooldown} s` : 'Renvoyer l’invitation'}</button>
            <span aria-live="polite" role={resendState.error ? 'alert' : 'status'} className="text-xs">{resendState.message || resendState.error || resendState.success}</span>
          </form>
        </>}
        <form action={cancelAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="profile_ref" value={profile.ref} />
          <label className="flex items-center gap-2 text-xs"><input name="confirm" type="checkbox" value="yes" required />Confirmer l’annulation du rattachement</label>
          <button className="min-h-10 rounded-lg border border-danger-border px-3 text-sm font-semibold text-danger" disabled={cancelPending}>{cancelPending ? 'Annulation…' : 'Annuler le rattachement'}</button>
          <span aria-live="polite" role={cancelState.error ? 'alert' : 'status'} className="w-full text-xs">{cancelState.error || cancelState.success}</span>
        </form>
        {profile.status === 'actif' && <form action={accessAction} className="flex flex-col gap-2 sm:items-end">
          <input type="hidden" name="user_id" value={profile.userId} /><input type="hidden" name="action" value="suspendre" />
          <label className="flex items-center gap-2 text-xs"><input name="confirm" type="checkbox" value="yes" required />Confirmer la suspension</label>
          <label className="w-full text-left text-xs font-medium">Motif obligatoire
            <input name="reason" minLength={5} maxLength={500} required className="mt-1 min-h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm" placeholder="Indique le motif" />
          </label>
          <button className="min-h-10 rounded-lg border border-danger-border px-3 text-sm font-semibold text-danger" disabled={accessPending}>{accessPending ? 'Mise à jour…' : 'Suspendre le compte'}</button>
          <span aria-live="polite" role={accessState.error ? 'alert' : 'status'} className="text-xs">{accessState.error || accessState.success}</span>
        </form>}
        {profile.status === 'suspendu' && <form action={accessAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="user_id" value={profile.userId} /><input type="hidden" name="action" value="reactiver" />
          <label className="flex items-center gap-2 text-xs"><input name="confirm" type="checkbox" value="yes" required />Confirmer la réactivation</label>
          <button className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" disabled={accessPending}>{accessPending ? 'Mise à jour…' : 'Réactiver le compte'}</button>
          <span aria-live="polite" role={accessState.error ? 'alert' : 'status'} className="text-xs">{accessState.error || accessState.success}</span>
        </form>}
      </div>}
    </article>
  )
}

