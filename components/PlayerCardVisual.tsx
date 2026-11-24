import Image from 'next/image'
import type { Player } from '@/lib/data/public'
import { playerCardInfo } from '@/lib/data/player-card'
import { playerCardImage, CARD_WIDTH, CARD_HEIGHT } from '@/lib/data/player-card-images'
import styles from './PlayerProfileCard.module.css'

export default function PlayerCardVisual({ player, variant = 'profile' }: { player: Player; variant?: 'profile' | 'compact' }) {
  const card = playerCardInfo(player)
  const status = card.status === 'blesse' ? 'Blessé' : card.status === 'suspendu' ? 'Suspendu' : null
  const isLoukouProfilePhoto = variant === 'profile' && card.jersey_number === 33 && card.first_name === 'KONAN' && card.last_name === 'LOUKOU'
  const profilePhotoUrl = isLoukouProfilePhoto ? '/images/players/konan-loukou.png' : card.photo_url
  const cardImage = playerCardImage(card.jersey_number)
  const cardAlt = `Carte joueur #${card.jersey_number} ${card.last_name} ${card.first_name}, ${(card.position ?? '').toLowerCase()}`

  if (cardImage) {
    const compact = variant === 'compact'
    return (
      <article className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- images déjà optimisées (WebP 540/800/1076), srcSet manuel */}
        <img
          src={compact ? cardImage.small : cardImage.full}
          srcSet={cardImage.srcSet}
          sizes={compact ? '(min-width: 1024px) 33vw, 50vw' : '(min-width: 1024px) 900px, 100vw'}
          alt={cardAlt}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          loading={compact ? 'lazy' : 'eager'}
          fetchPriority={compact ? 'auto' : 'high'}
          decoding="async"
          style={{ width: '100%', height: 'auto', aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
          className="block rounded-[3.2%] shadow-[0_5px_14px_var(--match-card-shadow)]"
        />
        {status && <span className="absolute right-2 top-2 rounded bg-danger px-2 py-1 text-[10px] font-bold uppercase leading-none text-on-brand">{status}</span>}
      </article>
    )
  }

  const photo = profilePhotoUrl
    ? <Image src={profilePhotoUrl} alt={`Photo de ${card.first_name} ${card.last_name}`} width={560} height={720} sizes="(min-width: 1024px) 48vw, 52vw" className={`${styles.photo} ${isLoukouProfilePhoto ? styles.photoBlend : ''}`} />
    : null

  if (variant === 'compact') {
    const compactPhoto = card.photo_url
      ? <Image src={card.photo_url} alt={`Photo de ${card.first_name} ${card.last_name}`} width={360} height={460} sizes="(min-width: 1024px) 33vw, 50vw" className="h-full w-full object-cover object-bottom" />
      : null

    return (
      <article className="player-card-compact relative isolate aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-[image:var(--player-card-gradient)] text-on-brand shadow-[0_5px_14px_var(--match-card-shadow)]">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 z-20 w-1.5 bg-gradient-to-b from-[var(--gold-500)] to-[var(--gold-deep)]" />
        <div aria-hidden="true" className="absolute bottom-0 left-1.5 right-0 z-20 h-[3px] bg-gradient-to-r from-[var(--gold-500)] to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-1 -top-3 z-[3] select-none font-display text-[7rem] leading-none text-[var(--gold-500)]/15 sm:text-[8rem]">
          {card.jersey_number ?? '—'}
        </div>
        {compactPhoto && <div className="absolute inset-y-0 right-0 z-[2] w-[58%] [mask-image:linear-gradient(to_right,transparent_0%,black_42%)]">{compactPhoto}</div>}

        <div className="absolute inset-y-2.5 left-3 z-10 flex w-[72%] flex-col sm:inset-y-3 sm:left-[26px] sm:w-[min(300px,78%)]">
          <div className="font-display text-[2.25rem] leading-none text-[var(--gold-500)] sm:text-[3.25rem]">#{card.jersey_number ?? '—'}</div>
          <div className="absolute left-0 top-1/2 max-w-full -translate-y-1/2 pr-2">
            <p className="truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.18em] text-[var(--player-card-first-name)] sm:text-sm sm:tracking-[0.25em]">{card.first_name}</p>
            <h2 className="mt-1 truncate font-display text-[1.7rem] uppercase leading-[0.95] tracking-wide text-on-brand sm:text-[2.625rem]">{card.last_name}</h2>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pr-1">
            <span className="max-w-full truncate text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-[var(--gold-500)] sm:text-base sm:tracking-[0.14em]">{card.position || 'Poste à préciser'}</span>
            {status && <span className="rounded bg-danger px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-on-brand sm:text-[10px]">{status}</span>}
          </div>
        </div>
      </article>
    )
  }

  const initials = `${card.first_name?.[0] ?? ''}${card.last_name?.[0] ?? ''}`.toUpperCase()
  const height = card.height
  const weight = card.weight

  return (
    <article className={styles.card}>
      <span aria-hidden="true" className={styles.watermark}>{card.jersey_number ?? '—'}</span>
      <div aria-hidden="true" className={styles.arch} />
      <div aria-hidden={!card.photo_url} className={styles.portrait}>
        {photo ?? <div className={styles.placeholder}>
          <span className={styles.initials}>{initials}</span>
          <svg viewBox="0 0 360 520" className={styles.silhouette} preserveAspectRatio="xMidYMax meet" focusable="false">
            <circle cx="180" cy="132" r="58" fill="#7A2D38" />
            <path d="M148 190h64v66c-17 15-47 15-64 0v-66Z" fill="#7A2D38" />
            <path d="M83 520c3-116 29-196 75-230l22 25 22-25c47 35 72 114 75 230H83Z" fill="#7A2D38" />
            <path d="m158 280 22 35 22-35 27 30-18 40h-62l-18-40 27-30Z" fill="#5C161E" />
            <path d="m157 280 23 35 23-35" fill="none" stroke="#E0B054" strokeOpacity=".72" strokeWidth="5" />
          </svg>
        </div>}
      </div>

      <div className={styles.content}>
        <p className={styles.number}>#{card.jersey_number ?? '—'}</p>
        <div className={styles.identity}>
          <p className={styles.familyName}>{card.first_name}</p>
          <h2 className={styles.firstName}>{card.last_name}</h2>
        </div>
        {(height || weight) && <div className={styles.physicalDetails}>
          <div aria-hidden="true" className={styles.goldRule} />
          <dl className={styles.measurements}>
            {height && <div className={styles.measurement}><dt>TAILLE</dt><dd>{height}</dd></div>}
            {height && weight && <div aria-hidden="true" className={styles.measurementDivider} />}
            {weight && <div className={styles.measurement}><dt>POIDS</dt><dd>{weight}</dd></div>}
          </dl>
        </div>}
        <p className={styles.position}>{card.position || 'Poste à préciser'}</p>
      </div>
      {status && <span className={styles.status}>{status}</span>}
    </article>
  )
}
