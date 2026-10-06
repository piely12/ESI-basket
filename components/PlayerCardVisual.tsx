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
    return (
      <article className="relative isolate aspect-[2/3] w-full overflow-hidden rounded-xl border border-[#bd842a] bg-[#210609] text-white shadow-lg shadow-[#210609]/30">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_62%_43%,#64201c_0%,#350c10_42%,#190407_100%)]" />
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 border-r border-[#d69734] bg-[repeating-linear-gradient(135deg,#d69734_0_3px,transparent_3px_9px)]" />
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1.5 border-l border-[#d69734] bg-[repeating-linear-gradient(45deg,#d69734_0_3px,transparent_3px_9px)]" />
        <Image src="/logos/esi.png" alt="" width={270} height={270} className="pointer-events-none absolute right-[-14%] top-[24%] z-0 h-[58%] w-[72%] object-contain opacity-[0.14]" />

        <div className="absolute inset-x-4 top-4 z-20 flex items-start justify-between gap-2 sm:inset-x-5 sm:top-5">
          <div className="min-w-0">
            <div className="font-display text-6xl leading-[0.8] text-[#f0bc58] drop-shadow sm:text-7xl">{card.jersey_number ?? '—'}</div>
            <div className="mt-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#f0bc58] sm:text-[9px]">The Lions of ESI</div>
          </div>
          <div className="max-w-[58%] border-y border-[#d69734] bg-[#2a080b]/75 px-2 py-2 text-right sm:px-3">
            <span className="block font-display text-xs uppercase leading-tight tracking-wide text-[#f2c875] sm:text-base">{card.position || 'Poste à préciser'}</span>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-[21%] top-[25%] z-10 flex items-end justify-center sm:inset-x-5">
          {card.photo_url ? <Image src={card.photo_url} alt={`${card.first_name} ${card.last_name}`} width={360} height={460} unoptimized className="h-full w-full object-cover object-top [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]" /> : (
            <div className="mb-8 grid h-24 w-24 place-items-center rounded-full border border-[#d69734]/60 bg-[#f0bc58]/10 font-display text-5xl text-[#f0bc58] sm:h-28 sm:w-28 sm:text-6xl">{card.first_name?.[0]}{card.last_name?.[0]}</div>
          )}
        </div>
        <div className="absolute bottom-[14%] left-3 z-20 w-[30%] sm:left-4 sm:w-[32%]">
          <Image src="/logos/esi.png" alt="" width={160} height={160} className="h-auto w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]" />
        </div>
        {status && <span className="absolute bottom-[22%] right-3 z-30 rounded border border-[#edb852] bg-[#30080d]/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#f2c875]">{status}</span>}
        <div className="absolute inset-x-3 bottom-2 z-20 border-t border-[#d69734] px-1 pt-1.5 text-center sm:inset-x-4 sm:bottom-3 sm:pt-2">
          <p className="truncate font-display text-xs uppercase tracking-[0.16em] text-[#edb852] sm:text-sm">{card.last_name}</p>
          <h2 className="mt-0.5 line-clamp-2 font-display text-2xl uppercase leading-[0.9] tracking-wide text-[#f2c875] sm:text-3xl">{card.first_name}</h2>
          <div aria-hidden="true" className="mx-auto mt-1.5 h-px w-3/4 bg-gradient-to-r from-transparent via-[#d69734] to-transparent" />
        </div>
      </article>
    )
  }

  return (
    <article className="relative isolate flex min-h-[260px] overflow-hidden rounded-xl bg-[var(--maroon-900)] text-white shadow-md sm:min-h-[300px]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-3 -top-10 font-display text-[18rem] leading-none text-white/[0.07]">{card.jersey_number ?? '—'}</div>
      <div className="relative z-10 flex w-[58%] flex-col justify-center p-5 sm:w-[56%] sm:p-8">
        <p className="font-display text-5xl leading-none text-[var(--gold-500)] sm:text-6xl">#{card.jersey_number ?? '—'}</p>
        <p className="mt-4 text-sm uppercase tracking-wide text-white/75 sm:text-base">{card.first_name}</p>
        <h2 className="font-display text-4xl uppercase leading-[0.95] sm:text-6xl">{card.last_name}</h2>
        <p className="mt-3 max-w-sm text-sm text-white/70 sm:text-base">{card.position || 'Poste à préciser'}</p>
        {status && <span className="mt-2 w-fit rounded bg-[var(--gold-500)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--maroon-900)]">{status}</span>}
      </div>
      <div className="absolute bottom-0 right-0 top-0 z-10 flex w-[43%] items-center justify-center px-2 pt-3 sm:relative sm:w-[44%] sm:px-4">
        <div className="h-[82%] w-full max-w-[230px] overflow-hidden rounded-t-full border-x border-t border-[var(--gold-500)]/50 bg-white/5 sm:h-[88%]">
          {photo}
        </div>
      </div>
    </article>
  )
}
