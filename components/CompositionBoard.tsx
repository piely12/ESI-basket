
'use client'

import { useEffect, useRef } from 'react'
import TeamLogo from '@/components/TeamLogo'
import type { Team } from '@/lib/data/public'
import { COURT_SLOTS, resolveStarterSlots, type LineupEntry } from '@/lib/lineup'
import styles from './composition-board.module.css'

const SCENE_WIDTH = 1202

const PLAYER_POSITIONS: Record<string, { left: number; top: number }> = {
  ailier_fort: { left: 141, top: 86 },
  pivot: { left: 461, top: 86 },
  ailier: { left: 104, top: 274 },
  arriere: { left: 498, top: 274 },
  meneur: { left: 301, top: 396 },
}

export default function CompositionBoard({
  matchId,
  team,
  opponent,
  scheduledAt,
  location,
  coachName,
  starters,
  bench,
}: {
  matchId: string
  team: Team
  opponent: Team
  scheduledAt: string
  location: string | null
  coachName: string | null
  starters: LineupEntry[]
  bench: LineupEntry[]
}) {
  // Correction : le viewport est un élément <div>.
  const viewportRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)

  const slots = resolveStarterSlots(starters)

  const date = new Date(scheduledAt).toLocaleDateString('fr-FR', {
    timeZone: 'Africa/Abidjan',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  useEffect(() => {
    const viewport = viewportRef.current
    const scene = sceneRef.current

    if (!viewport || !scene) return

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return

      const scale = Math.min(entry.contentRect.width / SCENE_WIDTH, 1)
      scene.style.setProperty('--scene-scale', String(scale))
    })

    resizeObserver.observe(viewport)

    return () => resizeObserver.disconnect()
  }, [])

  return (
    <article
      className={styles.board}
      aria-label={`Composition de ${team.name} contre ${opponent.name}`}
    >
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.scene} ref={sceneRef}>
          <div className={styles.homeLogo}>
            <TeamLogo team={team} size={92} />
          </div>

          <p className={styles.kicker}>Composition d&apos;équipe</p>

          <h2 className={styles.title}>
            {team.is_esi ? 'THE LIONS OF ESI' : team.name}
          </h2>

          <div className={styles.vs}>
            <h3>VS {opponent.is_esi ? 'ESI' : opponent.name}</h3>
            <p>
              {date} · {location || 'Lieu à confirmer'}
            </p>
          </div>

          <div className={styles.opponentLogo}>
            <TeamLogo team={opponent} size={98} />
          </div>

          <div className={styles.panel}>
            <div className={styles.court} aria-hidden="true">
              <svg
                viewBox="0 0 566 510"
                fill="none"
                stroke="var(--composition-line)"
                strokeWidth="2.5"
              >
                <rect
                  x="1.25"
                  y="1.25"
                  width="563.5"
                  height="507.5"
                />
                <rect
                  x="189"
                  y="1"
                  width="188"
                  height="226"
                  fill="var(--composition-paint)"
                  stroke="var(--composition-line)"
                />
                <circle cx="283" cy="226" r="66" />
                <path d="M38 1 V120 A245 265 0 0 0 528 120 V1" />
                <path d="M226 509 A57 57 0 0 1 340 509" />
                <line
                  x1="256"
                  y1="34"
                  x2="311"
                  y2="34"
                  strokeWidth="3"
                />
                <circle
                  cx="283"
                  cy="54"
                  r="15"
                  stroke="var(--composition-gold)"
                  strokeWidth="3.5"
                />
              </svg>
            </div>

            {COURT_SLOTS.map((slot) => {
              const entry = slots.get(slot.key)
              const position = PLAYER_POSITIONS[slot.key]

              if (!entry || !position) return null

              return (
                <div
                  className={styles.player}
                  key={slot.key}
                  style={{
                    left: position.left,
                    top: position.top,
                  }}
                >
                  <span className={styles.number}>
                    {entry.player.jersey_number ?? '·'}
                  </span>

                  <span className={styles.playerName}>
                    {entry.player.first_name} {entry.player.last_name}
                  </span>

                  <span className={styles.position}>
                    {slot.courtLabel}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Conserve ici la suite de ton JSX original si le fichier
              contient d'autres sections après le bloc des joueurs. */}
        </div>
      </div>
    </article>
  )
}
