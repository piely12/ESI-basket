import Image from 'next/image'
import teams from './teams'

export default function TeamBanner({ team, season = '2026-2027' }) {
  const config = teams[team]
  if (!config) return null

  const longName = config.name.length > 6
  const style = {
    '--team-bg': config.bg,
    '--team-left': config.left,
    '--team-accent': config.accent,
    '--team-title': config.title,
    '--team-ghost': config.ghost,
    '--team-disc': config.disc,
  }

  return (
    <section
      aria-label={`${config.name}, saison ${season}`}
      className="relative isolate h-[132px] w-full overflow-hidden rounded-xl border border-border bg-[var(--team-bg)] sm:h-[156px] sm:rounded-2xl lg:h-[176px]"
      style={style}
    >
      {/* Panneau clair et séparation diagonale */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[37%]"
        style={{ background: 'linear-gradient(135deg, var(--team-left), color-mix(in oklch, var(--team-left), var(--team-accent) 26%))', clipPath: 'polygon(0 0, 100% 0, 76% 100%, 0 100%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-[29%] w-[10%]"
        style={{ background: 'var(--team-bg)', clipPath: 'polygon(58% 0, 100% 0, 42% 100%, 0 100%)' }}
      />

      {/* Logo en médaillon */}
      <div className="absolute left-[16%] top-1/2 z-10 grid size-[82px] -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full border-2 border-[var(--team-accent)] bg-[var(--team-disc)] sm:size-[104px] lg:size-[118px]">
        <Image
          src={config.logo}
          alt={`Logo de ${config.name}`}
          width={144}
          height={144}
          priority
          className={`size-full ${config.shape === 'circle' ? 'rounded-full object-cover' : 'scale-[0.78] object-contain'}`}
        />
      </div>

      {/* Sigle fantôme en arrière-plan */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-[40%] top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-team-graffiti text-[clamp(4rem,12vw,9rem)] leading-none ${longName ? 'text-[clamp(3rem,8vw,6rem)]' : ''}`}
        style={{ color: 'transparent', WebkitTextStroke: '1.5px var(--team-ghost)' }}
      >
        {config.name}
      </span>

      {/* Nom et saison */}
      <div className="absolute inset-y-0 left-[35%] z-10 flex w-[61%] flex-col justify-center overflow-hidden">
        <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.28em] text-[var(--team-title)] sm:text-[10px]">ÉQUIPE</p>
        <h1 className={`m-0 whitespace-nowrap font-team-graffiti text-[clamp(2.55rem,8vw,6.2rem)] leading-[0.96] text-[var(--team-title)] ${longName ? 'text-[clamp(1.9rem,6vw,4.4rem)]' : ''}`}>
          {config.name}
        </h1>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--team-title)] sm:text-[10px]">Saison {season}</p>
      </div>
    </section>
  )
}
