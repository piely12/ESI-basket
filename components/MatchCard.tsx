import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import type { MatchRow, Team } from '@/lib/data/public'
import { formatMatchDate } from '@/lib/format'
import TeamLogo, { teamLogoSrc } from '@/components/TeamLogo'
import MatchShareIcon from '@/components/MatchShare'
import styles from './MatchCard.module.css'

function teamLabel(team: Team) {
  return team.is_esi ? 'ESI' : team.name
}

function VenueIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
}

function TeamSide({ team, large, right = false }: { team: Team; large: boolean; right?: boolean }) {
  return (
    <div className={`${styles.teamSide} ${right ? styles.rightSide : ''}`}>
      <TeamLogo team={team} size={large ? 96 : 64} className={styles.logo} />
      <div className={styles.teamIdentity}>
        <div className={`${styles.teamName} ${team.is_esi ? styles.esiName : ''}`}>{teamLabel(team)}</div>
        <div className={`${styles.underline} ${team.is_esi ? styles.esiUnderline : ''}`} />
      </div>
    </div>
  )
}

function MatchLink({ match, children, className }: { match: MatchRow; children: ReactNode; className: string }) {
  return (
    <Link
      href={`/matchs/${match.id}`}
      aria-label={`Voir la confrontation ${teamLabel(match.home_team)} contre ${teamLabel(match.away_team)}`}
      className={className}
    >
      {children}
    </Link>
  )
}

function ShareShortcut({ match }: { match: MatchRow }) {
  const finished = match.status === 'termine' && match.home_score !== null && match.away_score !== null
  return <MatchShareIcon matchId={match.id} home={{ name: teamLabel(match.home_team), isEsi: match.home_team.is_esi }} away={{ name: teamLabel(match.away_team), isEsi: match.away_team.is_esi }} date={formatMatchDate(match.scheduled_at, match.kickoff_confirmed)} venue={match.kickoff_confirmed ? match.location || 'Lieu à confirmer' : 'Horaire et lieu à confirmer'} round={match.round_number} homeScore={match.home_score} awayScore={match.away_score} composition={[]} kind={finished ? 'score' : 'poster'} className={styles.shareShortcut} />
}

function EsiCard({ match, large, showShare }: { match: MatchRow; large: boolean; showShare: boolean }) {
  const played = match.status === 'termine' && match.home_score !== null && match.away_score !== null
  const tied = played && match.home_score === match.away_score
  const homeWon = played && match.home_score! > match.away_score!
  const awayWon = played && match.away_score! > match.home_score!
  const esiWon = (match.home_team.is_esi && homeWon) || (match.away_team.is_esi && awayWon)
  const status = played ? (tied ? 'Match nul' : esiWon ? 'Victoire' : 'Défaite') : match.status === 'en_cours' ? 'En cours' : match.status === 'jour_j' ? 'Jour de match' : 'À venir'
  const homeWatermark = { '--watermark-image': `url("${teamLogoSrc(match.home_team)}")` } as CSSProperties
  const awayWatermark = { '--watermark-image': `url("${teamLogoSrc(match.away_team)}")` } as CSSProperties

  return (
    <div className={styles.cardWrap}>
    <MatchLink match={match} className={`${styles.card} ${large ? styles.large : ''}`}>
      <div className={styles.homePanel} aria-hidden="true" />
      <div className={`${styles.watermark} ${styles.homeWatermark}`} style={homeWatermark} aria-hidden="true" />
      <div className={`${styles.watermark} ${styles.awayWatermark}`} style={awayWatermark} aria-hidden="true" />
      <div className={`${styles.stripe} ${styles.goldStripe}`} aria-hidden="true" />
      <div className={`${styles.stripe} ${styles.orangeStripe}`} aria-hidden="true" />

      <span className={`${styles.chip} ${styles.date}`}>{formatMatchDate(match.scheduled_at, match.kickoff_confirmed)}</span>
      <span className={`${styles.chip} ${styles.status}`}>
        <span className={`${styles.statusDot} ${!played ? styles.pulse : ''}`} />{status}
      </span>

      <div className={styles.stage}>
        <TeamSide team={match.home_team} large={large} />
        <TeamSide team={match.away_team} large={large} right />
      </div>

      <div className={`${styles.score} ${played ? styles.played : ''}`} aria-label={played ? `Score ${match.home_score} à ${match.away_score}` : 'Match à venir'}>
        {played ? <span><b className={homeWon ? styles.winner : ''}>{match.home_score}</b><i>–</i><b className={awayWon ? styles.winner : ''}>{match.away_score}</b></span> : <span>VS</span>}
      </div>

      <div className={styles.details}>
        {match.round_number && <span className={styles.round}>Journée {match.round_number}</span>}
        {match.public_note && <span className={styles.note}>{match.public_note}</span>}
        <span className={styles.venue}><VenueIcon />{match.kickoff_confirmed ? match.location || 'Lieu à confirmer' : 'Horaire et lieu à confirmer'}</span>
      </div>
      <span className={styles.screenReader}>Ouvrir la confrontation</span>
    </MatchLink>
    {showShare && <ShareShortcut match={match} />}
    </div>
  )
}

function OtherCard({ match, compact = false, showShare }: { match: MatchRow; compact?: boolean; showShare: boolean }) {
  const played = match.status === 'termine' && match.home_score !== null && match.away_score !== null
  return (
    <div className={styles.cardWrap}>
    <MatchLink match={match} className={`${styles.otherCard} ${compact ? styles.compactCard : ''}`}>
      <div className={styles.otherMeta}>
        <span>{formatMatchDate(match.scheduled_at, match.kickoff_confirmed)}</span>
        <span>{played ? 'Terminé' : match.status === 'en_cours' ? 'En cours' : 'À venir'}</span>
      </div>
      <div className={styles.otherTeams}>
        <TeamSide team={match.home_team} large={false} />
        <div className={styles.otherScore}>{played ? <>{match.home_score}–{match.away_score}</> : 'VS'}</div>
        <TeamSide team={match.away_team} large={false} right />
      </div>
      {match.round_number && <div className={styles.otherRound}>Journée {match.round_number}</div>}
      {match.public_note && <div className={styles.otherNote}>{match.public_note}</div>}
      <div className={styles.otherVenue}><VenueIcon />{match.kickoff_confirmed ? match.location || 'Lieu à confirmer' : 'Horaire et lieu à confirmer'}</div>
    </MatchLink>
    {showShare && <ShareShortcut match={match} />}
    </div>
  )
}

export default function MatchCard({ match, large = false, compact = false, showShare = false }: { match: MatchRow; large?: boolean; compact?: boolean; showShare?: boolean }) {
  const isEsiMatch = match.home_team.is_esi || match.away_team.is_esi
  if (compact && !isEsiMatch) return <OtherCard match={match} compact showShare={showShare} />
  return isEsiMatch
    ? <EsiCard match={match} large={large} showShare={showShare} />
    : <OtherCard match={match} showShare={showShare} />
}
