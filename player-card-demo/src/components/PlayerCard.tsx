import { memo, useState } from 'react'
import styles from './PlayerCard.module.css'

export type PlayerCardProps = {
  numero: string
  nom: string
  prenom: string
  poste: string
  taille: string
  poids: string
  photo?: string
  maskArche?: boolean
}

function PhotoPlaceholder({ initials }: { initials: string }) {
  return (
    <div className={styles.placeholder} aria-hidden="true">
      <svg className={styles.placeholderSvg} viewBox="0 0 360 520" focusable="false">
        <text className={styles.initials} x="180" y="355" textAnchor="middle">{initials}</text>
        <circle className={styles.silhouette} cx="180" cy="132" r="62" />
        <path className={styles.silhouette} d="M83 470c4-112 34-190 97-190s93 78 97 190H83Z" />
        <path className={styles.neck} d="M151 205h58v57c-13 16-45 16-58 0v-57Z" />
      </svg>
    </div>
  )
}

function PlayerCard({
  numero = '—', nom = 'JOUEUR', prenom = '', poste = 'POSTE À PRÉCISER',
  taille = '', poids = '', photo, maskArche = false,
}: PlayerCardProps) {
  const source = photo?.trim() ?? ''
  const [failedImageSource, setFailedImageSource] = useState<string | null>(null)

  const initials = `${prenom.trim().charAt(0)}${nom.trim().charAt(0)}`.toUpperCase() || 'ESI'
  const showPhoto = Boolean(source) && failedImageSource !== source

  return (
    <article className={styles.card} aria-label={`Joueur ${prenom} ${nom}, numéro ${numero}`}>
      <span className={styles.watermark} aria-hidden="true">{numero}</span>
      <div className={styles.playerPhoto}>
        {showPhoto ? (
          <img
            className={`${styles.photo} ${maskArche ? styles.arche : ''}`}
            src={source}
            alt={`Photo de ${prenom} ${nom}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailedImageSource(source)}
          />
        ) : <PhotoPlaceholder initials={initials} />}
      </div>

      <div className={styles.content}>
        <p className={styles.number}>#{numero}</p>
        <header className={styles.identity}>
          <p className={styles.familyName}>{nom}</p>
          <h3 className={styles.firstName}>{prenom}</h3>
        </header>
        <div className={styles.goldRule} aria-hidden="true" />
        <dl className={styles.measurements}>
          <div className={styles.measurement}><dt>TAILLE</dt><dd>{taille || '—'}</dd></div>
          <div className={styles.measurementDivider} aria-hidden="true" />
          <div className={styles.measurement}><dt>POIDS</dt><dd>{poids || '—'}</dd></div>
        </dl>
        <p className={styles.position}>{poste}</p>
      </div>
    </article>
  )
}

export default memo(PlayerCard)
