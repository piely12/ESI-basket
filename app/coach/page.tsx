import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { Team } from '@/lib/data/public'
import styles from './coach.module.css'

type CoachMatch = {
  id: string
  scheduled_at: string
  location: string | null
  status: string
  home_score: number | null
  away_score: number | null
  home_team: Team
  away_team: Team
}

type CoachPlayer = { id: string; first_name: string; last_name: string; jersey_number: number | null; status: string }
const COACH_ROLES = ['coach', 'coach_adjoint', 'admin']

function formatMatchDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' })
}

export default async function CoachHomePage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')
  const profile = await getCurrentUserProfile(supabase)
  if (!profile || !COACH_ROLES.includes(profile.role)) redirect('/acces-refuse')

  let teamId = profile.team_id
  if (!teamId && profile.role === 'admin') {
    const { data: esi } = await supabase.from('teams').select('id').eq('is_esi', true).maybeSingle()
    teamId = esi?.id ?? null
  }
  if (!teamId) redirect('/acces-refuse')

  const [matchesResult, rosterResult, resultsResult] = await Promise.all([
    supabase.from('matches')
      .select('id,scheduled_at,location,status,home_score,away_score,home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)')
      .or('home_team_id.eq.' + teamId + ',away_team_id.eq.' + teamId)
      .in('status', ['programme', 'a_venir', 'jour_j', 'en_cours'])
      .order('scheduled_at', { ascending: true }).limit(8),
    supabase.from('players').select('id,first_name,last_name,jersey_number,status')
      .eq('team_id', teamId).order('jersey_number', { ascending: true }),
    supabase.from('matches')
      .select('id,scheduled_at,location,status,home_score,away_score,home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)')
      .or('home_team_id.eq.' + teamId + ',away_team_id.eq.' + teamId)
      .eq('status', 'termine').order('scheduled_at', { ascending: false }).limit(4),
  ])
  const matches = (matchesResult.data ?? []) as unknown as CoachMatch[]
  const roster = (rosterResult.data ?? []) as CoachPlayer[]
  const recentResults = (resultsResult.data ?? []) as unknown as CoachMatch[]
  const unavailable = roster.filter((player) => player.status !== 'actif').length

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Pilotage de l’équipe</p>
        <h1 className={styles.title}>Bonjour {profile.first_name}</h1>
        <p className={styles.subtitle}>Prépare les Lions, suis les disponibilités et garde le cap sur le prochain match.</p>
        <div style={{ marginTop: 20 }}>
          <Link className={styles.button + ' ' + styles.primaryButton} href="/coach/matchs/nouveau">Préparer un match</Link>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label="Résumé de l’équipe">
        <article className={styles.metric}><strong>{roster.length}</strong><span>Joueurs à l’effectif</span></article>
        <article className={styles.metric}><strong>{unavailable}</strong><span>Indisponibilités déclarées</span></article>
        <article className={styles.metric}><strong>{matches.length}</strong><span>Matchs à venir</span></article>
        <article className={styles.metric}><strong>{recentResults.length}</strong><span>Résultats récents</span></article>
      </section>

      <section className={styles.page} aria-labelledby="upcoming-heading">
        <div className={styles.sectionHead}>
          <div><p className={styles.eyebrow}>Calendrier</p><h2 id="upcoming-heading" className={styles.cardTitle}>Prochains matchs</h2></div>
          <Link className={styles.link} href="/coach/matchs/nouveau">+ Nouveau</Link>
        </div>
        {matches.length === 0 ? (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Aucun match planifié</h3>
            <p className={styles.subtitle}>Ajoute une rencontre pour préparer les convocations et le cinq de départ.</p>
            <Link className={styles.button + ' ' + styles.primaryButton} href="/coach/matchs/nouveau">Créer le premier match</Link>
          </div>
        ) : (
          <div className={styles.matchList}>
            {matches.map((match) => <article className={styles.matchCard} key={match.id}>
              <div className={styles.matchMeta}><time dateTime={match.scheduled_at}>{formatMatchDate(match.scheduled_at)}</time><span>{match.location || 'Lieu à confirmer'}</span></div>
              <div className={styles.teams}><strong>{match.home_team.name}</strong><span className={styles.vs}>VS</span><strong>{match.away_team.name}</strong></div>
              <Link className={styles.button} href={'/coach/matchs/' + match.id}>Ouvrir la fiche match</Link>
            </article>)}
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="roster-heading">
        <div className={styles.sectionHead}>
          <div><p className={styles.eyebrow}>Groupe</p><h2 id="roster-heading" className={styles.cardTitle}>Effectif et disponibilités</h2></div>
          <Link className={styles.link} href="/coach/equipe">Gérer l’effectif</Link>
        </div>
        <div className={styles.rosterList}>
          {roster.slice(0, 6).map((player) => <div className={styles.playerRow} key={player.id}>
            <span className={styles.number}>{player.jersey_number ?? '·'}</span>
            <span><strong className={styles.playerName}>{player.first_name} {player.last_name}</strong><small className={styles.playerMeta}>{player.status === 'actif' ? 'Disponible' : player.status === 'blesse' ? 'Blessé' : 'Suspendu'}</small></span>
          </div>)}
        </div>
      </section>

      {recentResults.length > 0 && <section className={styles.page} aria-labelledby="results-heading">
        <div><p className={styles.eyebrow}>Après-match</p><h2 id="results-heading" className={styles.cardTitle}>Derniers résultats</h2></div>
        <div className={styles.matchList}>{recentResults.map((match) => <article className={styles.matchCard} key={match.id}>
          <div className={styles.matchMeta}><time dateTime={match.scheduled_at}>{formatMatchDate(match.scheduled_at)}</time><span>{match.location || 'Match terminé'}</span></div>
          <div className={styles.teams}><strong>{match.home_team.name}</strong><span className={styles.score}>{match.home_score ?? 0} - {match.away_score ?? 0}</span><strong>{match.away_team.name}</strong></div>
          <Link className={styles.link} href={'/coach/matchs/' + match.id}>Consulter les statistiques</Link>
        </article>)}</div>
      </section>}
    </main>
  )
}
