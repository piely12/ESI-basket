import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireUser'
import { createAdminClient } from '@/lib/supabase/admin'
import InviteTeamAccountForm from './InviteTeamAccountForm'
import styles from '../coach.module.css'

export default async function CoachInvitationsPage() {
  const { profile } = await requireRole('coach')
  if (!profile.team_id) redirect('/acces-refuse')
  const admin = createAdminClient()
  const { data: team } = await admin.from('teams').select('id').eq('id', profile.team_id).eq('is_esi', true).maybeSingle()
  if (!team) redirect('/acces-refuse')

  const [{ data: players }, { data: staff }] = await Promise.all([
    admin.from('players').select('id,first_name,last_name,jersey_number').eq('team_id', team.id).is('user_id', null).order('jersey_number'),
    admin.from('staff').select('id,first_name,last_name,role').eq('team_id', team.id).in('role', ['coach_adjoint', 'statisticienne']).is('user_id', null),
  ])
  const targets = [
    ...(players ?? []).map((player) => ({ value: `joueur:${player.id}`, label: `Joueur · #${player.jersey_number ?? '—'} ${player.first_name} ${player.last_name}` })),
    ...(staff ?? []).map((person) => ({ value: `staff:${person.id}`, label: `${person.role === 'coach_adjoint' ? 'Coach adjoint' : 'Statisticienne'} · ${person.first_name} ${person.last_name}` })),
  ]

  return <main className={styles.page}>
    <Link href="/coach" className={styles.button}>Retour à l’espace coach</Link>
    <header className={styles.pageHeader}>
      <div><p className={styles.eyebrow}>Association de comptes</p><h1 className={styles.title}>Associer un compte</h1>
        <p className={styles.subtitle}>Associe un compte existant ou invite un joueur ESI, le coach adjoint ou la statisticienne à partir de sa fiche.</p></div>
    </header>
    <section className={styles.card}>
      {targets.length ? <InviteTeamAccountForm targets={targets} /> : <p className={styles.subtitle}>Toutes les fiches joueur, coach adjoint et statisticienne sont déjà associées à un compte.</p>}
    </section>
  </main>
}
