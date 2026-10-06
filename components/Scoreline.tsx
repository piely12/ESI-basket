import type { Team } from '@/lib/data/public'

export default function Scoreline({
  homeTeam, awayTeam, homeScore, awayScore, size = 'lg',
}: {
  homeTeam: Team; awayTeam: Team
  homeScore: number | null; awayScore: number | null
  size?: 'lg' | 'md'
}) {
  const played = homeScore !== null && awayScore !== null
  const big = size === 'lg' ? 'text-6xl' : 'text-3xl'
  const row = (t: Team, s: number | null, won: boolean) => (
    <div className="flex items-center justify-between gap-4">
      <span className={`font-display uppercase tracking-wide ${t.is_esi ? 'text-[var(--maroon-700)]' : 'text-[var(--ink)]'} ${won ? 'font-semibold' : ''}`}>
        {t.name}
      </span>
      {played && <span className={`font-display ${big} tnum ${won ? 'text-[var(--maroon-700)]' : 'text-[var(--ink-soft)]'}`}>{s}</span>}
    </div>
  )
  const homeWon = played && (homeScore as number) > (awayScore as number)
  const awayWon = played && (awayScore as number) > (homeScore as number)
  return (
    <div className="flex flex-col gap-2">
      {row(homeTeam, homeScore, homeWon)}
      {row(awayTeam, awayScore, awayWon)}
    </div>
  )
}
