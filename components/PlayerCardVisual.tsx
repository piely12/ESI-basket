import Image from 'next/image'
import type { Player } from '@/lib/data/public'
import { playerCardInfo } from '@/lib/data/player-card'

export default function PlayerCardVisual({ player, variant = 'profile' }: { player: Player; variant?: 'profile' | 'compact' }) {
  const card = playerCardInfo(player)
  const status = card.status === 'blesse' ? 'Blessé' : card.status === 'suspendu' ? 'Suspendu' : null
  const photo = card.photo_url
    ? <Image src={card.photo_url} alt={`${card.first_name} ${card.last_name}`} width={360} height={460} unoptimized className="h-full w-full object-cover object-top" />
    : <div className="grid h-full w-full place-items-center bg-white/5 font-display text-5xl text-white/45">{card.first_name?.[0]}{card.last_name?.[0]}</div>

  if (variant === 'compact') {
    const compactPhoto = card.photo_url ? (
      <Image src={card.photo_url} alt={`${card.first_name} ${card.last_name}`} width={360} height={460} unoptimized className="h-full w-full object-cover object-bottom" />
    ) : null

    return (
      <article className="relative isolate aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-[linear-gradient(115deg,#7a0f1f_0%,#5e0b19_48%,#470506_100%)] text-white shadow-[0_5px_14px_rgba(0,0,0,0.18)]">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 z-20 w-1.5 bg-gradient-to-b from-[#f6b93b] to-[#e8791d]" />
        <div aria-hidden="true" className="absolute bottom-0 left-1.5 right-0 z-20 h-[3px] bg-gradient-to-r from-[#f6b93b] to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-1 -top-3 z-[3] select-none font-display text-[7rem] leading-none text-[#f6b93b]/15 sm:text-[8rem]">
          {card.jersey_number ?? String.fromCharCode(0x2014)}
        </div>
        {compactPhoto && <div className="absolute inset-y-0 right-0 z-[2] w-[58%] [mask-image:linear-gradient(to_right,transparent_0%,black_42%)]">
          {compactPhoto}
        </div>}

        <div className="absolute inset-y-2.5 left-3 z-10 flex w-[72%] flex-col sm:inset-y-3 sm:left-[26px] sm:w-[min(300px,78%)]">
          <div className="font-display text-[2.25rem] leading-none text-[#f6b93b] sm:text-[3.25rem]">#{card.jersey_number ?? String.fromCharCode(0x2014)}</div>
          <div className="absolute left-0 top-1/2 max-w-full -translate-y-1/2 pr-2">
            <p className="truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.18em] text-[#f3dcc4] sm:text-sm sm:tracking-[0.25em]">{card.first_name}</p>
            <h2 className="mt-1 truncate font-display text-[1.7rem] uppercase leading-[0.95] tracking-wide text-white sm:text-[2.625rem]">{card.last_name}</h2>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pr-1">
            <span className="max-w-full truncate text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-[#f6b93b] sm:text-base sm:tracking-[0.14em]">{card.position || ('Poste ' + String.fromCharCode(0x00e0) + ' pr' + String.fromCharCode(0x00e9) + 'ciser')}</span>
            {status && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white sm:text-[10px]">{status}</span>}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="relative isolate flex min-h-[260px] overflow-hidden rounded-xl bg-[var(--maroon-900)] text-white shadow-md sm:min-h-[340px] lg:min-h-[440px]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-3 -top-10 font-display text-[18rem] leading-none text-white/[0.07]">{card.jersey_number ?? '—'}</div>
      <div className="absolute inset-y-0 left-0 z-10 flex w-[58%] flex-col p-5 sm:w-[56%] sm:p-8">
        <p className="font-display text-6xl leading-[0.8] text-[var(--gold-500)] sm:text-7xl">#{card.jersey_number ?? '—'}</p>
        <div className="absolute left-5 right-3 top-1/2 -translate-y-1/2 sm:left-8 sm:right-5">
          <p className="font-display text-lg uppercase leading-none tracking-[0.16em] text-white/75 sm:text-2xl">{card.first_name}</p>
          <h2 className="mt-1 line-clamp-2 break-words font-display text-[clamp(2rem,6vw,4.5rem)] uppercase leading-[0.9] tracking-wide text-white lg:text-[calc(clamp(2rem,6vw,4.5rem)-2px)]">{card.last_name}</h2>
        </div>
        <div className="mt-auto flex flex-wrap items-end gap-2 pr-1">
          <p className="font-display text-[clamp(1.2rem,3vw,1.9rem)] uppercase leading-tight tracking-[0.1em] text-[var(--gold-500)]">{card.position || 'Poste à préciser'}</p>
          {status && <span className="mb-0.5 rounded bg-[var(--gold-500)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--maroon-900)]">{status}</span>}
        </div>
      </div>
      <div className="absolute bottom-0 right-0 top-0 z-10 flex w-[40%] items-center justify-center px-2 pt-3 sm:w-[42%] sm:px-4">
        <div className="h-[82%] w-full max-w-[230px] overflow-hidden rounded-t-full border-x border-t border-[var(--gold-500)]/50 bg-white/5 sm:h-[88%] lg:max-w-[340px]">
          {photo}
        </div>
      </div>
    </article>
  )
}
