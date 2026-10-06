import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import { createMatch } from '../../actions'
import styles from '../../coach.module.css'

const COACH_ROLES = ['coach', 'coach_adjoint', 'admin']
export default async function NewCoachMatchPage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')
  const profile = await getCurrentUserProfile(supabase)
  if (!profile || !COACH_ROLES.includes(profile.role)) redirect('/acces-refuse')
  let teamId = profile.team_id
  if (!teamId && profile.role === 'admin') {
    const { data } = await supabase.from('teams').select('id').eq('is_esi', true).maybeSingle()
    teamId = data?.id ?? null
  }
  if (!teamId) redirect('/acces-refuse')
  const [{ data: opponents }, { data: competitions }] = await Promise.all([
    supabase.from('teams').select('id,name,city,logo_url,is_esi').neq('id', teamId).order('name'),
    supabase.from('competitions').select('id,name').order('name'),
  ])
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>Calendrier de l’équipe</p><h1 className={styles.title}>Préparer un match</h1>
          <p className={styles.subtitle}>Enregistre la rencontre, puis prépare les convocations et la composition.</p></div>
        <Link className={styles.button} href="/coach">Retour au tableau de bord</Link>
      </header>
      <section className={styles.card}>
        {(!opponents || opponents.length === 0) ? (
          <div className={styles.notice}>Ajoute d’abord les équipes adverses dans la base de données pour créer une rencontre.</div>
        ) : (
          <form action={createMatch} className={styles.form}>
            <div className={styles.field}><label htmlFor="opponent">Adversaire</label>
              <select id="opponent" name="opponent_id" required defaultValue=""><option value="" disabled>Choisir une équipe</option>
                {opponents.map((team) => <option key={team.id} value={team.id}>{team.name}{team.city ? ' · ' + team.city : ''}</option>)}
              </select></div>
            <div className={styles.field}><label htmlFor="home-away">Terrain</label>
              <select id="home-away" name="home_away" defaultValue="home"><option value="home">À domicile</option><option value="away">À l’extérieur</option></select></div>
            <div className={styles.field}><label htmlFor="scheduled-at">Date et heure (heure d’Abidjan)</label>
              <input id="scheduled-at" name="scheduled_at" type="datetime-local" required /></div>
            <div className={styles.field}><label htmlFor="location">Salle / lieu</label>
              <input id="location" name="location" maxLength={160} placeholder="Ex. Gymnase de l’ESI" /></div>
            {competitions && competitions.length > 0 && <div className={styles.field}><label htmlFor="competition">Compétition</label>
              <select id="competition" name="competition_id" defaultValue=""><option value="">Match amical / non précisé</option>
                {competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
              </select></div>}
            <button type="submit" className={styles.button + ' ' + styles.primaryButton}>Créer le match</button>
          </form>
        )}
      </section>
    </main>
  )
}
