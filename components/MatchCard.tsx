import Link from 'next/link'
import type { MatchRow } from '@/lib/data/public'
import { formatMatchDate } from '@/lib/format'
import TeamLogo from '@/components/TeamLogo'

export default function MatchCard({ match, large = false }: { match: MatchRow; large?: boolean }) {
  const played = match.home_score !== null && match.away_score !== null
  const esiHome = match.home_team.is_esi
  const esiAway = match.away_team.is_esi
  const won = played && ((esiHome && match.home_score! > match.away_score!) || (esiAway && match.away_score! > match.home_score!))
  const lost = played && ((esiHome && match.home_score! < match.away_score!) || (esiAway && match.away_score! < match.home_score!))
  const logoSize = large ? 64 : 44

  return (
    <Link href={`/matchs/${match.id}`} className={`group block rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${esiHome || esiAway ? 'border-[var(--gold-500)] bg-[var(--surface)]' : 'border-[var(--line)] bg-[var(--surface)]'}`}>
      <div className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
        <span>{formatMatchDate(match.scheduled_at, match.kickoff_confirmed)}</span>
        {played ? <span className={won ? 'text-[var(--gold-deep)]' : lost ? 'text-[var(--maroon-700)]' : ''}>{won ? 'Victoire ESI' : lost ? 'Défaite ESI' : 'Terminé'}</span> : <span>À venir</span>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        {[match.home_team, match.away_team].map((team, index) => (
          <div key={team.id} className={`flex min-w-0 items-center gap-2 ${index === 1 ? 'order-3 flex-row-reverse text-right' : ''}`}>
            <TeamLogo team={team} size={logoSize} className={large ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-10 w-10'} />
            <span className={`truncate font-display text-xl leading-none sm:text-2xl ${team.is_esi ? 'text-[var(--maroon-700)]' : ''}`}>{team.name}</span>
          </div>
        ))}
        <span className="order-2 font-display text-3xl tabular-nums text-[var(--maroon-700)] sm:text-4xl">{played ? `${match.home_score}–${match.away_score}` : 'VS'}</span>
      </div>
      {match.round_number && <div className="mt-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--gold-deep)]">Journée {match.round_number}</div>}
      {match.public_note && <div className="mt-1 text-center text-sm font-semibold text-[var(--maroon-700)]">{match.public_note}</div>}
      <div className="mt-2 text-center text-xs text-[var(--ink-soft)]">{match.kickoff_confirmed ? match.location || 'Lieu à confirmer' : 'Horaire et lieu à confirmer'}</div>
    </Link>
  )
}
