import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireUser'
import type { Team } from '@/lib/data/public'
import styles from '../coach/coach.module.css'

type AdjointMatch = {
  id: string; scheduled_at: string; location: string | null; kickoff_confirmed: boolean
  home_team: Team; away_team: Team
}

export default async function AssistantCoachHomePage() {
  const { supabase, profile } = await requireRole('coach_adjoint')
  if (!profile.team_id) redirect('/acces-refuse')
  const { data: team } = await supabase.from('teams').select('id').eq('id', profile.team_id).eq('is_esi', true).maybeSingle()
  if (!team) redirect('/acces-refuse')
  const { data } = await supabase.from('matches')
    .select('id,scheduled_at,location,kickoff_confirmed,home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)')
    .or('home_team_id.eq.' + team.id + ',away_team_id.eq.' + team.id)
    .order('scheduled_at', { ascending: false }).limit(100)
  const matches = (data ?? []) as unknown as AdjointMatch[]
  const workflowResult = matches.length ? await supabase.from('match_composition_workflows').select('match_id,status').eq('team_id', team.id).in('match_id', matches.map((match) => match.id)) : { data: [] }
  const workflows = new Map((workflowResult.data ?? []).map((row) => [row.match_id, row.status]))
  return <main className={styles.page}>
    <header className={styles.hero}><p className={styles.eyebrow}>Espace coach adjoint</p><h1 className={styles.title}>Bonjour {profile.first_name}</h1><p className={styles.subtitle}>Sélectionne un match pour préparer ou vérifier sa composition.</p></header>
    <section className={styles.page} aria-labelledby="matches-heading">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Calendrier</p><h2 id="matches-heading" className={styles.cardTitle}>Matchs existants</h2></div></div>
      {matches.length === 0 ? <div className={styles.card}><h3 className={styles.cardTitle}>Aucun match</h3><p className={styles.subtitle}>Le calendrier ESI ne contient aucun match.</p></div> : <div className={styles.matchList}>
        {matches.map((match) => <article className={styles.matchCard} key={match.id}>
          <div className={styles.matchMeta}><time dateTime={match.scheduled_at}>{new Date(match.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'medium', ...(match.kickoff_confirmed ? { hour: '2-digit' as const, minute: '2-digit' as const } : {}), timeZone: 'Africa/Abidjan' })}</time><span>{match.location || 'Lieu à confirmer'}</span></div>
          <div className={styles.teams}><strong>{match.home_team.name}</strong><span className={styles.vs}>VS</span><strong>{match.away_team.name}</strong></div>
          <p className={styles.help}>Composition : {workflows.get(match.id) ?? 'à préparer'}</p>
          <Link className={styles.button} href={'/adjoint/matchs/' + match.id}>Ouvrir la composition</Link>
        </article>)}
      </div>}
    </section>
  </main>
}
