import TeamLogo from '@/components/TeamLogo'
import type { Team } from '@/lib/data/public'
import { COURT_SLOTS, resolveStarterSlots, type LineupEntry } from '@/lib/lineup'
import styles from './composition-board.module.css'

export default function CompositionBoard({
  team,
  opponent,
  scheduledAt,
  location,
  coachName,
  starters,
  bench,
}: {
  team: Team
  opponent: Team
  scheduledAt: string
  location: string | null
  coachName: string | null
  starters: LineupEntry[]
  bench: LineupEntry[]
}) {
  const slots = resolveStarterSlots(starters)
  const date = new Date(scheduledAt).toLocaleDateString('fr-FR', {
    timeZone: 'Africa/Abidjan', day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <article className={styles.board} aria-label={`Composition de ${team.name} contre ${opponent.name}`}>
      <header className={styles.header}>
        <div className={styles.teamHeading}>
          <div className={styles.homeLogo}><TeamLogo team={team} size={100} /></div>
          <div className={styles.homeCopy}>
            <p className={styles.eyebrow}>Composition d’équipe</p>
            <h2>{team.is_esi ? 'THE LIONS OF ESI' : team.name}</h2>
          </div>
        </div>
        <div className={styles.opponentHeading}>
          <div className={styles.opponentCopy}>
            <p className={styles.opponentName}>VS {opponent.is_esi ? 'ESI' : opponent.name}</p>
            <p className={styles.matchMeta}>{date} · {location || 'Lieu à confirmer'}</p>
          </div>
          <div className={styles.opponentLogo}><TeamLogo team={opponent} size={92} /></div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.court}>
          <svg className={styles.courtLines} viewBox="0 0 640 480" role="img" aria-label="Demi-terrain de basketball">
            <g fill="none" stroke="currentColor" strokeOpacity=".43" strokeWidth="3">
              <rect x="20" y="20" width="600" height="440" />
              <path d="M218 20 V193 H422 V20" className={styles.keyArea} />
              <path d="M218 193 A102 67 0 0 0 422 193" />
              <path d="M60 20 V110 A260 260 0 0 0 580 110 V20" />
              <path d="M290 30 H350" />
              <path d="M290 30 V42 H350 V30" className={styles.hoop} />
            </g>
          </svg>
          {COURT_SLOTS.map((slot) => {
            const entry = slots.get(slot.key)
            return <div className={styles.token} key={slot.key} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
              {entry ? <>
                <span className={styles.number}>{entry.player.jersey_number ?? '·'}</span>
                <span className={styles.playerName}>{entry.player.last_name} {entry.player.first_name}</span>
                <span className={styles.position}>{slot.courtLabel}</span>
              </> : <>
                <span className={`${styles.number} ${styles.emptyNumber}`}>—</span>
                <span className={styles.emptyName}>À confirmer</span>
                <span className={styles.position}>{slot.courtLabel}</span>
              </>}
            </div>
          })}
        </div>

        <aside className={styles.benchPanel}>
          <h3>Les remplaçants</h3>
          {bench.length ? <ul className={styles.benchList}>{bench.map(({ player }) => <li key={player.id}>
            <span className={styles.benchNumber}>{player.jersey_number ?? '·'}</span>
            <span className={styles.benchName}>{player.last_name} {player.first_name}</span>
            <span className={styles.benchPosition}>{player.position || 'Poste à préciser'}</span>
          </li>)}</ul> : <p className={styles.emptyBench}>Aucun remplaçant enregistré.</p>}
          <div className={styles.coach}><span>Coach</span><strong>{coachName || 'Staff technique'}</strong></div>
        </aside>
      </div>
    </article>
  )
}
