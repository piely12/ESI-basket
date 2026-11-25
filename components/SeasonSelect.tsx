'use client'

import { usePathname, useRouter } from 'next/navigation'

/** Choix de la saison : la page se met à jour dès qu'on change, sans bouton « Appliquer ». */
export default function SeasonSelect({ seasons, current }: { seasons: { id: string; name: string }[]; current: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  if (seasons.length <= 1) {
    return seasons[0] ? <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-bold">Saison {seasons[0].name}</span> : null
  }
  return (
    <label className="inline-flex items-center gap-2 text-sm font-bold">
      <span className="sr-only">Saison</span>
      <select id="player-season" value={current ?? ''} onChange={(event) => router.push(`${pathname}?season=${event.target.value}`)}
        className="min-h-10 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 text-sm font-bold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)]">
        {seasons.map((season) => <option key={season.id} value={season.id}>Saison {season.name}</option>)}
      </select>
    </label>
  )
}
