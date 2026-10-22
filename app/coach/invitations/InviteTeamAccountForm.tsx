'use client'

import { useActionState } from 'react'
import { inviteTeamAccount, type CoachInviteState } from '../actions'
import styles from '../coach.module.css'

const initialState: CoachInviteState = { error: '', success: '' }

export default function InviteTeamAccountForm({ targets }: { targets: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState(inviteTeamAccount, initialState)
  return <form action={action} className={styles.form}>
    <div className={styles.field}>
      <label htmlFor="invite-profile">Fiche à associer</label>
      <select id="invite-profile" name="profile_ref" required defaultValue="">
        <option value="" disabled>Choisir une fiche existante</option>
        {targets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
      </select>
    </div>
    <div className={styles.field}>
      <label htmlFor="account-mode">Compte</label>
      <select id="account-mode" name="mode" required defaultValue="creer">
        <option value="creer">Créer un compte invité</option>
        <option value="lier">Rattacher un compte existant</option>
      </select>
    </div>
    <div className={styles.field}>
      <label htmlFor="invite-email">Adresse e-mail autorisée</label>
      <input id="invite-email" name="email" type="email" autoComplete="email" maxLength={254} required />
    </div>
    <p className={styles.help}>Le compte est associé uniquement à la fiche sélectionnée. La personne reçoit un code à usage unique et choisit elle-même son mot de passe.</p>
    <button className={`${styles.button} ${styles.primaryButton}`} disabled={pending}>{pending ? 'Envoi…' : 'Associer le compte et envoyer le code'}</button>
    {(state.error || state.success) && <p className={state.error ? styles.error : styles.notice} role={state.error ? 'alert' : 'status'}>{state.error || state.success}</p>}
  </form>
}
