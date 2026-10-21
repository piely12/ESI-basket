import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAnyRole } from '@/lib/auth/requireUser'
import CompositionWizard from '@/components/CompositionWizard'
import type { Team } from '@/lib/data/public'
import { COURT_SLOTS, resolveStarterSlots, type CourtSlot, type LineupEntry } from '@/lib/lineup'
import { isMatchLockedByTime } from '@/lib/match-time'
import { updateMatchDetails, saveMatchPreparation, saveMatchResult, savePlayerStats, updateMatchStatus } from '../../actions'
import styles from '../../coach.module.css'

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }
type Player = { id: string; first_name: string; last_name: string; jersey_number: number | null; position: string | null; status: string; team_id: string }
type PlayerStat = { player_id: string; minutes_played: number; points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number; plus_minus: number; evaluation: number | null }
const statusLabels: Record<string, string> = { programme: 'Programmé', a_venir: 'À venir', jour_j: 'Jour de match', en_cours: 'En cours', termine: 'Terminé' }

export default async function CoachMatchPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const { supabase, profile } = await requireAnyRole(['coach', 'admin'])

  const { data: match, error: matchError } = await supabase.from('matches')
    .select('id,scheduled_at,location,round_number,kickoff_confirmed,public_note,status,home_score,away_score,home_team_id,away_team_id,home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)')
    .eq('id', id).maybeSingle()
  if (matchError || !match) notFound()
  if (profile.role !== 'admin' && (!profile.team_id || ![match.home_team_id, match.away_team_id].includes(profile.team_id))) redirect('/acces-refuse')

  const teamIds = profile.role === 'admin' ? [match.home_team_id, match.away_team_id] : [profile.team_id as string]
  const preparationTeamId = profile.role === 'admin' ? match.home_team_id : profile.team_id as string
  const homeTeam = match.home_team as unknown as Team
  const awayTeam = match.away_team as unknown as Team
  const compositionTeam = profile.role === 'admin' ? (homeTeam.is_esi ? homeTeam : awayTeam) : (profile.team_id === homeTeam.id ? homeTeam : awayTeam)
  const opponentTeam = compositionTeam.id === homeTeam.id ? awayTeam : homeTeam
  const [playersResult, rosterResult, lineupResult, preparationResult, statsResult, workflowResult] = await Promise.all([
    supabase.from('players').select('id,first_name,last_name,jersey_number,position,status,photo_url,team_id').eq('team_id', compositionTeam.id).order('jersey_number'),
    supabase.from('match_rosters').select('id,player_id,is_called_up,availability_status').eq('match_id', id),
    supabase.from('match_lineups').select('player_id,is_starter,court_slot').eq('match_id', id),
    supabase.from('match_preparations').select('game_plan,opponent_notes').eq('match_id', id).eq('team_id', preparationTeamId).maybeSingle(),
    supabase.from('match_player_stats').select('player_id,minutes_played,points,rebounds,assists,steals,blocks,turnovers,plus_minus,evaluation').eq('match_id', id),
    supabase.from('match_composition_workflows').select('status,draft_availability,draft_selected_player_ids,draft_court_slots').eq('match_id', id).eq('team_id', compositionTeam.id).maybeSingle(),
  ])
  const loadError = playersResult.error || rosterResult.error || lineupResult.error || preparationResult.error || statsResult.error || workflowResult.error
  if (loadError) console.error('Unable to load coach match data', {
    players: playersResult.error?.message,
    roster: rosterResult.error?.message,
    lineups: lineupResult.error?.message,
    preparation: preparationResult.error?.message,
    playerStats: statsResult.error?.message,
    workflow: workflowResult.error?.message,
  })
  const players = (playersResult.data ?? []) as Player[]
  const rosterRows = rosterResult.data ?? []
  const rosterIds = new Set(rosterRows.filter((row) => row.is_called_up).map((row) => row.player_id))
  const statsByPlayer = new Map(((statsResult.data ?? []) as PlayerStat[]).map((row) => [row.player_id, row]))
  const convokedPlayers = players.filter((player) => rosterIds.has(player.id))
  const workflow = workflowResult.data as { status: 'brouillon' | 'publiee' | 'verrouillee'; draft_availability: { player_id: string; availability_status: 'disponible' | 'blesse' | 'indisponible' }[]; draft_selected_player_ids: string[]; draft_court_slots: Partial<Record<CourtSlot, string>> } | null
  const savedStarters = (lineupResult.data ?? []).flatMap((row) => { const player = players.find((candidate) => candidate.id === row.player_id); return player && row.is_starter ? [{ player, is_starter: true, court_slot: row.court_slot as CourtSlot | null }] as LineupEntry[] : [] })
  const initialSlots = resolveStarterSlots(savedStarters)
  const initialSlotSelections: Partial<Record<CourtSlot, string>> = workflow ? workflow.draft_court_slots : Object.fromEntries(COURT_SLOTS.flatMap((slot) => { const playerId = initialSlots.get(slot.key)?.player.id; return playerId ? [[slot.key, playerId]] : [] }))
  const initialAvailability = workflow ? workflow.draft_availability : rosterRows.flatMap((row) => row.availability_status ? [{ player_id: row.player_id, availability_status: row.availability_status as 'disponible' | 'blesse' | 'indisponible' }] : [])
   const initialSelectedIds = workflow?.draft_selected_player_ids ?? []
  const scheduleValue = new Date(match.scheduled_at).toISOString().slice(0, 16)
  const savedMessages: Record<string, string> = {
    convocations: 'Les convocations ont été enregistrées.',
    composition: 'Le cinq majeur et les remplaçants ont été enregistrés.',
    details: 'Les informations du match ont été mises à jour.',
    preparation: 'La préparation privée a été enregistrée.',
    resultat: 'Le résultat final a été enregistré.',
    statistiques: 'Les statistiques et évaluations sont sauvegardées.',
  }

  return (
    <main className={styles.page}>
      <Link className={styles.link} href="/coach">Retour au tableau de bord</Link>
      <header className={styles.hero}>
        <div className={styles.pageHeader}>
          <div><p className={styles.eyebrow}>Gestion du match</p><h1 className={styles.title}>{homeTeam.name} · {awayTeam.name}</h1>
            <p className={styles.subtitle}>{new Date(match.scheduled_at).toLocaleDateString('fr-FR', { dateStyle: 'full', timeZone: 'Africa/Abidjan' })}{match.kickoff_confirmed ? ` · ${new Date(match.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' })}` : ' · Horaire à confirmer'} · {match.location || 'Lieu à confirmer'}</p>
            {match.public_note && <p className={styles.help}>{match.public_note}</p>}</div>
          <span className={styles.privateLabel}>{statusLabels[match.status] ?? match.status}</span>
        </div>
        <div className={styles.teams} style={{ marginTop: 18 }}>
          <strong>{homeTeam.name}</strong>
          <span className={styles.score}>{match.home_score === null ? 'VS' : match.home_score + ' - ' + match.away_score}</span>
          <strong>{awayTeam.name}</strong>
        </div>
      </header>

      {query.saved && savedMessages[query.saved] && <p role="status" className={styles.notice}>{savedMessages[query.saved]}</p>}
       {loadError && <p role="alert" className={styles.error}>Certaines données n’ont pas pu être chargées. Vérifie les droits de lecture et applique la migration 027.</p>}

      {profile.role === 'admin' && <>
      <section className={styles.card}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Organisation</p><h2 className={styles.cardTitle}>Date, lieu et statut</h2></div></div>
        <form action={updateMatchDetails} className={styles.form}>
          <input type="hidden" name="match_id" value={match.id} />
          <div className={styles.field}><label htmlFor="match-date">Date et heure (Abidjan)</label><input id="match-date" name="scheduled_at" type="datetime-local" defaultValue={scheduleValue} required />{!match.kickoff_confirmed && <small className={styles.help}>Horaire provisoire: indique l’heure officielle avant de partager le calendrier.</small>}</div>
          <div className={styles.field}><label htmlFor="match-location">Salle / lieu</label><input id="match-location" name="location" maxLength={160} defaultValue={match.location ?? ''} /></div>
          <button className={styles.button} type="submit">Enregistrer les détails</button>
        </form>
        {match.status !== 'termine' && <form action={updateMatchStatus} className={styles.form} style={{ marginTop: 18 }}>
          <input type="hidden" name="match_id" value={match.id} />
          <div className={styles.field}><label htmlFor="match-status">Avancement</label><select id="match-status" name="status" defaultValue={match.status}>
            <option value="programme">Programmé</option><option value="a_venir">À venir</option><option value="jour_j">Jour de match</option><option value="en_cours">En cours</option>
          </select></div>
          <button className={styles.button} type="submit">Mettre à jour le statut</button>
        </form>}
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Plan de jeu</p><h2 className={styles.cardTitle}>Préparation privée</h2></div><span className={styles.privateLabel}>Visible par le staff uniquement</span></div>
        <form action={saveMatchPreparation} className={styles.form}>
          <input type="hidden" name="match_id" value={match.id} />
          <div className={styles.field}><label htmlFor="game-plan">Consignes et plan de jeu</label><textarea id="game-plan" name="game_plan" maxLength={5000} defaultValue={preparationResult.data?.game_plan ?? ''} placeholder="Défense, rotations, priorités offensives…" /></div>
          <div className={styles.field}><label htmlFor="opponent-notes">Notes sur l’adversaire</label><textarea id="opponent-notes" name="opponent_notes" maxLength={5000} defaultValue={preparationResult.data?.opponent_notes ?? ''} placeholder="Points forts, habitudes, joueurs à suivre…" /></div>
          <button className={styles.button + ' ' + styles.primaryButton} type="submit">Enregistrer le plan de match</button>
        </form>
      </section>

      </>}

      {profile.role === 'coach'
        ? <CompositionWizard canOverrideLock={false} matchId={match.id} team={compositionTeam} opponent={opponentTeam} scheduledAt={match.scheduled_at} location={match.location} kickoffConfirmed={match.kickoff_confirmed} coachName={profile.first_name + ' ' + profile.last_name} players={players} initialAvailability={initialAvailability} initialSelectedIds={initialSelectedIds} initialSlots={initialSlotSelections} initialStatus={isMatchLockedByTime(match.scheduled_at, match.status) ? 'verrouillee' : workflow?.status ?? 'brouillon'} />
        : <section className={styles.card}><p className={styles.eyebrow}>Composition</p><h2 className={styles.cardTitle}>Gestion réservée au coach principal</h2><p className={styles.help}>Le compte administrateur gère le calendrier et les comptes. Le coach principal prépare et publie la composition avec son propre accès.</p></section>}

      {profile.role === 'admin' && <>
      <section className={styles.card}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Après-match</p><h2 className={styles.cardTitle}>Résultat final</h2></div></div>
        <form action={saveMatchResult} className={styles.form}>
          <input type="hidden" name="match_id" value={match.id} />
          <div className={styles.metricGrid}>
            <div className={styles.field}><label htmlFor="home-score">Score · {homeTeam.name}</label><input id="home-score" name="home_score" type="number" min="0" max="250" defaultValue={match.home_score ?? ''} required /></div>
            <div className={styles.field}><label htmlFor="away-score">Score · {awayTeam.name}</label><input id="away-score" name="away_score" type="number" min="0" max="250" defaultValue={match.away_score ?? ''} required /></div>
          </div>
          <button className={styles.button + ' ' + styles.primaryButton} type="submit">Terminer le match et enregistrer</button>
        </form>
      </section>

      {match.status === 'termine' && <section className={styles.card}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Statistiques individuelles</p><h2 className={styles.cardTitle}>Bilan des joueurs convoqués</h2></div></div>
        {convokedPlayers.length === 0 ? <p className={styles.subtitle}>Aucun joueur convoqué pour cette rencontre.</p> : <form action={savePlayerStats} className={styles.form}>
          <input type="hidden" name="match_id" value={match.id} />
          <div className={styles.rosterList}>{convokedPlayers.map((player) => {
            const stat = statsByPlayer.get(player.id)
            return <article className={styles.matchCard} key={player.id}>
              <input type="hidden" name="player_ids" value={player.id} />
              <div><strong className={styles.playerName}>{player.first_name} {player.last_name}</strong><small className={styles.playerMeta}>N°{player.jersey_number ?? '·'} · {player.position || 'Poste à préciser'}</small></div>
              <div className={styles.metricGrid}>
                <div className={styles.field}><label htmlFor={'min-' + player.id}>Minutes</label><input id={'min-' + player.id} name={'minutes_' + player.id} type="number" min="0" max="60" step="0.5" defaultValue={stat?.minutes_played ?? 0} /></div>
                <div className={styles.field}><label htmlFor={'pts-' + player.id}>Points</label><input id={'pts-' + player.id} name={'points_' + player.id} type="number" min="0" max="150" defaultValue={stat?.points ?? 0} /></div>
                <div className={styles.field}><label htmlFor={'reb-' + player.id}>Rebonds</label><input id={'reb-' + player.id} name={'rebounds_' + player.id} type="number" min="0" max="100" defaultValue={stat?.rebounds ?? 0} /></div>
                <div className={styles.field}><label htmlFor={'ast-' + player.id}>Passes décisives</label><input id={'ast-' + player.id} name={'assists_' + player.id} type="number" min="0" max="100" defaultValue={stat?.assists ?? 0} /></div>
                <div className={styles.field}><label htmlFor={'stl-' + player.id}>Interceptions</label><input id={'stl-' + player.id} name={'steals_' + player.id} type="number" min="0" max="100" defaultValue={stat?.steals ?? 0} /></div>
                <div className={styles.field}><label htmlFor={'blk-' + player.id}>Contres</label><input id={'blk-' + player.id} name={'blocks_' + player.id} type="number" min="0" max="100" defaultValue={stat?.blocks ?? 0} /></div>
                <div className={styles.field}><label htmlFor={'tov-' + player.id}>Balles perdues</label><input id={'tov-' + player.id} name={'turnovers_' + player.id} type="number" min="0" max="100" defaultValue={stat?.turnovers ?? 0} /></div>
              </div>
              <div className={styles.metricGrid}>
                <div className={styles.field}><label htmlFor={'pm-' + player.id}>Plus / moins (+/-)</label><input id={'pm-' + player.id} name={'plus_minus_' + player.id} type="number" min="-300" max="300" defaultValue={stat?.plus_minus ?? 0} /></div>
                <div className={styles.field}><label htmlFor={'eval-' + player.id}>Évaluation coach /100</label><input id={'eval-' + player.id} name={'evaluation_' + player.id} type="number" min="0" max="100" step="0.5" defaultValue={stat?.evaluation ?? ''} /></div>
              </div>
            </article>
          })}</div>
          <p className={styles.help}>Le +/- mesure l’écart de points lorsque le joueur est sur le terrain. L’évaluation est une appréciation distincte du coach. Ces données restent privées jusqu’à leur publication.</p>
          <button className={styles.button + ' ' + styles.primaryButton} type="submit">Enregistrer le bilan</button>
        </form>}
      </section>}
      </>}
    </main>
  )
}
