'use client'

import { useActionState, useState } from 'react'
import { inviteTeamAccount, type CoachInviteState } from '../actions'
import styles from '../coach.module.css'
import { useRateLimitCooldown } from '@/components/useRateLimitCooldown'

const initialState: CoachInviteState = { ok: true, error: '', success: '' }

export default function InviteTeamAccountForm({ targets }: { targets: { value: string; label: string }[] }) {
  const [cooldown, startCooldown] = useRateLimitCooldown()
  const [state, action, pending] = useActionState(async (previous: CoachInviteState, formData: FormData) => {
    const next = await inviteTeamAccount(previous, formData)
    if (next.code === 'RATE_LIMITED') startCooldown(next.retryAfterSeconds ?? 0)
    return next
  }, initialState)
  const [profileRef, setProfileRef] = useState('')
  const [mode, setMode] = useState('creer')
  const [email, setEmail] = useState('')
  return <form action={action} className={styles.form}>
    <div className={styles.field}>
      <label htmlFor="invite-profile">Fiche à associer</label>
      <select id="invite-profile" name="profile_ref" required value={profileRef} onChange={(event) => setProfileRef(event.target.value)}>
        <option value="" disabled>Choisir une fiche existante</option>
        {targets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
      </select>
    </div>
    <div className={styles.field}>
      <label htmlFor="account-mode">Compte</label>
      <select id="account-mode" name="mode" required value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="creer">Créer un compte invité</option>
        <option value="lier">Rattacher un compte existant</option>
      </select>
    </div>
    <div className={styles.field}>
      <label htmlFor="invite-email">Adresse e-mail autorisée</label>
      <input id="invite-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
    </div>
    <p className={styles.help}>Le compte est associé uniquement à la fiche sélectionnée. La personne reçoit un code à usage unique et choisit elle-même son mot de passe.</p>
    <button className={`${styles.button} ${styles.primaryButton}`} disabled={pending || cooldown > 0}>{pending ? 'Envoi…' : cooldown > 0 ? `Réessaie dans ${cooldown} s` : 'Associer le compte et envoyer le code'}</button>
    {(state.error || state.success) && <p className={state.error ? styles.error : styles.notice} role={state.error ? 'alert' : 'status'}>{state.message || state.error || state.success}</p>}
  </form>
}
