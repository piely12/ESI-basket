import Image from 'next/image'
import teams from './teams'

const alpha = (color, percentage) => color.replace(')', ` / ${percentage}%)`)

export default function TeamBanner({ team, season = '2026-2027' }) {
  const config = teams[team]
  if (!config) return null

  const isCircle = config.shape === 'circle'
  const longName = config.name.length > 6
  const style = {
    '--team-bg': config.bg,
    '--team-accent': config.accent,
    '--team-glow': alpha(config.accent, 22),
    '--team-outline': 'oklch(1 0 0 / 14%)',
  }

  return (
    <div className="box-border w-full bg-background p-6 max-md:p-3" style={style}>
      <section
        aria-label={`${config.name}, saison ${season}`}
        className="relative h-[260px] overflow-hidden rounded-2xl border border-border bg-[var(--team-bg)] shadow-lg max-md:h-[190px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 45% 90% at 82% 50%, var(--team-glow) 0%, transparent 70%)' }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-5 -left-1 select-none whitespace-nowrap font-display text-[100px] leading-[.8] text-transparent md:-bottom-10 md:text-[160px]"
          style={{ WebkitTextStroke: '2px var(--team-outline)' }}
        >
          {config.name}
        </div>

        <div className="absolute -right-5 top-0 flex h-full w-[42%] items-center justify-center md:right-5 md:w-[38%]">
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full"
            viewBox="0 0 500 320"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            stroke="var(--team-accent)"
            strokeWidth="2"
          >
            <circle cx="250" cy="160" r="130" strokeOpacity=".28" />
            <circle cx="250" cy="160" r="190" strokeOpacity=".14" />
            <path d="M250 0V320" strokeOpacity=".18" />
          </svg>
          <Image
            src={config.logo}
            alt={`Logo de ${config.name}`}
            width={200}
            height={200}
            priority
            className={`relative z-[1] h-[110px] w-[110px] md:h-[200px] md:w-[200px] ${isCircle ? 'rounded-full object-cover' : 'object-contain'}`}
            style={isCircle ? { boxShadow: `0 8px 20px oklch(0 0 0 / 42%), 0 0 0 2px ${alpha(config.accent, 55)}` } : { filter: 'drop-shadow(0 8px 18px oklch(0 0 0 / 45%))' }}
          />
        </div>

        <div className="relative z-[2] flex h-full max-w-[68%] flex-col justify-center gap-2 pl-6 md:gap-3 md:pl-12">
          <div
            className="self-start rounded-full border px-3 py-1 text-[10px] font-bold tracking-[.2em] md:text-xs"
            style={{ borderColor: config.accent, background: alpha(config.accent, 18), color: config.accent }}
          >
            {season}
          </div>
          <h1
            className={`m-0 whitespace-nowrap font-display text-[clamp(42px,8vw,92px)] font-normal leading-[.84] tracking-[.02em] text-white ${longName ? 'text-[clamp(36px,6vw,72px)]' : ''}`}
          >
            {config.name}
          </h1>
          <span className="h-[3px] w-12 rounded-sm md:h-1 md:w-16" style={{ background: config.accent }} aria-hidden="true" />
        </div>
      </section>
    </div>
  )
}
