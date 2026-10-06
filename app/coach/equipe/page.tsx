import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import { updatePlayerAvailability } from '../actions'
import styles from '../coach.module.css'

const COACH_ROLES = ['coach', 'coach_adjoint', 'admin']
export default async function CoachRosterPage() {
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
  const { data } = await supabase.from('players')
    .select('id,first_name,last_name,jersey_number,position,status,photo_url')
    .eq('team_id', teamId).order('jersey_number', { ascending: true })
  const players = data ?? []
  const available = players.filter((player) => player.status === 'actif').length
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>Groupe officiel</p><h1 className={styles.title}>Effectif & disponibilités</h1>
          <p className={styles.subtitle}>{players.length} joueurs · {available} disponibles</p></div>
      </header>
      <section className={styles.card} aria-label="Liste des joueurs">
        <div className={styles.rosterList}>
          {players.map((player) => <article className={styles.playerRow} key={player.id}>
            <span className={styles.number}>{player.jersey_number ?? '·'}</span>
            <span><strong className={styles.playerName}>{player.first_name} {player.last_name}</strong>
              <small className={styles.playerMeta}>{player.position || 'Poste à préciser'}</small></span>
            <form action={updatePlayerAvailability} className={styles.availability}>
              <input type="hidden" name="player_id" value={player.id} />
              <label className="sr-only" htmlFor={'availability-' + player.id}>Disponibilité de {player.first_name} {player.last_name}</label>
              <select id={'availability-' + player.id} name="status" defaultValue={player.status}>
                <option value="actif">Disponible</option><option value="blesse">Blessé</option><option value="suspendu">Suspendu</option>
              </select>
              <button className={styles.button} type="submit">Enregistrer</button>
            </form>
          </article>)}
        </div>
        {players.length === 0 && <p className={styles.subtitle}>Aucun joueur dans l’effectif de cette équipe.</p>}
      </section>
      <p className={styles.help}>Les changements de disponibilité sont enregistrés dans Supabase et appliqués aux prochaines convocations.</p>
    </main>
  )
}
