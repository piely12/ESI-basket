'use client'

import { useActionState } from 'react'
import {
  createOrLinkAccount,
  updatePlayerStatus,
} from './actions'

export type AccountTarget = { value: string; label: string }
const INITIAL_ACTION_STATE = { error: '', success: '' }

const fieldClass = 'mt-1 min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-base text-[var(--ink)] outline-none focus:border-[var(--gold-deep)] focus:ring-2 focus:ring-[var(--gold-500)]/30'
const labelClass = 'text-sm font-semibold text-[var(--ink)]'
const buttonClass = 'min-h-12 rounded-xl bg-[var(--maroon-900)] px-5 font-semibold text-white transition hover:bg-[var(--maroon-700)] disabled:cursor-wait disabled:bg-[var(--ink-soft)]'

export function AdminAccountForm({ targets }: { targets: AccountTarget[] }) {
  const [state, formAction, pending] = useActionState(createOrLinkAccount, INITIAL_ACTION_STATE)

  if (targets.length === 0) {
    return <p className="rounded-xl bg-[var(--paper)] p-4 text-sm text-[var(--ink-soft)]">
      Toutes les fiches joueur et staff sont déjà associées à un compte.
    </p>
  }

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="profile-ref" className={labelClass}>Fiche à rattacher</label>
        <select id="profile-ref" name="profile_ref" className={fieldClass} required defaultValue="">
          <option value="" disabled>Choisir une fiche</option>
          {targets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="account-mode" className={labelClass}>Type d’association</label>
        <select id="account-mode" name="mode" className={fieldClass} defaultValue="creer">
          <option value="creer">Créer un compte Supabase</option>
          <option value="lier">Rattacher un compte existant</option>
        </select>
      </div>
      <div>
        <label htmlFor="account-email" className={labelClass}>Adresse e-mail du compte</label>
        <input id="account-email" name="email" type="email" autoComplete="email" maxLength={254} className={fieldClass} required />
      </div>
      <div>
        <label htmlFor="initial-password" className={labelClass}>Mot de passe initial</label>
        <input id="initial-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} className={fieldClass} />
        <p className="mt-1 text-xs text-[var(--ink-soft)]">À remplir uniquement pour créer un compte. Pour un compte existant, laisse vide.</p>
      </div>
      <div className="md:col-span-2">
        <p className="mb-3 text-xs text-[var(--ink-soft)]">Un compte créé ici est activé immédiatement. Transmets le mot de passe initial directement à la personne concernée.</p>
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer le compte'}
        </button>
        <p aria-live="polite" role={state.error ? 'alert' : 'status'} className={`mt-3 min-h-5 text-sm ${state.error ? 'text-red-700' : 'text-[var(--maroon-900)]'}`}>
          {state.error || state.success}
        </p>
      </div>
    </form>
  )
}

export function AdminPlayerStatusForm({
  playerId,
  playerName,
  status,
}: {
  playerId: string
  playerName: string
  status: string
}) {
  const [state, formAction, pending] = useActionState(updatePlayerStatus, INITIAL_ACTION_STATE)

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 sm:justify-end">
      <input type="hidden" name="player_id" value={playerId} />
      <label className="sr-only" htmlFor={`status-${playerId}`}>Disponibilité de {playerName}</label>
      <select id={`status-${playerId}`} name="status" defaultValue={status} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus:border-[var(--gold-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-500)]/30">
        <option value="actif">Disponible</option>
        <option value="blesse">Blessé</option>
        <option value="suspendu">Suspendu</option>
      </select>
      <button type="submit" className="min-h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--maroon-900)] transition hover:bg-[var(--paper)] disabled:cursor-wait" disabled={pending}>
        {pending ? '…' : 'Enregistrer'}
      </button>
      <span aria-live="polite" className="w-full text-xs text-[var(--ink-soft)] sm:text-right">
        {state.error || state.success || STATUS_LABELS[status]}
      </span>
    </form>
  )
}

const STATUS_LABELS: Record<string, string> = {
  actif: 'Disponible',
  blesse: 'Blessé',
  suspendu: 'Suspendu',
}
