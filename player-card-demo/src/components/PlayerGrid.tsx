import type { PlayerCardProps } from './PlayerCard'
import PlayerCard from './PlayerCard'
import styles from './PlayerGrid.module.css'

export default function PlayerGrid({ players }: { players: PlayerCardProps[] }) {
  return (
    <section className={styles.grid} aria-label="Effectif des joueurs">
      {players.map((player) => (
        <div className={styles.cardCell} key={`${player.numero}-${player.nom}`}>
          <PlayerCard {...player} />
        </div>
      ))}
    </section>
  )
}
