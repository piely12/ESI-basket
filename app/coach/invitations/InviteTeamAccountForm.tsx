'use client'

import { useActionState } from 'react'
import { inviteTeamAccount, type CoachInviteState } from '../actions'
import styles from '../coach.module.css'

const initialState: CoachInviteState = { error: '', success: '' }

export default function InviteTeamAccountForm({ targets }: { targets: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState(inviteTeamAccount, initialState)
  return <form action={action} className={styles.form}>
    <div className={styles.field}>
      <label htmlFor="invite-profile">Fiche à inviter</label>
      <select id="invite-profile" name="profile_ref" required defaultValue="">
        <option value="" disabled>Choisir une fiche existante</option>
        {targets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
      </select>
    </div>
    <div className={styles.field}>
      <label htmlFor="invite-email">Adresse e-mail autorisée</label>
      <input id="invite-email" name="email" type="email" autoComplete="email" maxLength={254} required />
    </div>
    <p className={styles.help}>Le compte est lié à la fiche sélectionnée. La personne reçoit un code à usage unique et choisit elle-même son mot de passe. Les comptes déjà existants et les autres rôles doivent être associés par l’administration.</p>
    <button className={`${styles.button} ${styles.primaryButton}`} disabled={pending}>{pending ? 'Envoi…' : 'Créer et envoyer l’invitation'}</button>
    {(state.error || state.success) && <p className={state.error ? styles.error : styles.notice} role={state.error ? 'alert' : 'status'}>{state.error || state.success}</p>}
  </form>
}
