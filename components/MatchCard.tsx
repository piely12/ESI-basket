import Link from 'next/link'
import type { MatchRow } from '@/lib/data/public'
import { formatMatchDate } from '@/lib/format'
import TeamLogo from '@/components/TeamLogo'

export default function MatchCard({ match, large = false }: { match: MatchRow; large?: boolean }) {
  const played = match.status === 'termine' && match.home_score !== null && match.away_score !== null
  const esiHome = match.home_team.is_esi
  const esiAway = match.away_team.is_esi
  const won = played && ((esiHome && match.home_score! > match.away_score!) || (esiAway && match.away_score! > match.home_score!))
  const lost = played && ((esiHome && match.home_score! < match.away_score!) || (esiAway && match.away_score! < match.home_score!))
  const logoSize = large ? 64 : 44
  const matchHref = `/matchs/${match.id}`

  return (
    <article className={`rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${esiHome || esiAway ? 'border-[var(--gold-500)] bg-[var(--surface)]' : 'border-[var(--line)] bg-[var(--surface)]'}`}>
      <Link href={matchHref} className="mb-3 flex items-center justify-between gap-2 rounded text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">
        <span>{formatMatchDate(match.scheduled_at, match.kickoff_confirmed)}</span>
        {played ? <span className={won ? 'text-[var(--gold-deep)]' : lost ? 'text-[var(--maroon-700)]' : ''}>{won ? 'Victoire ESI' : lost ? 'Défaite ESI' : 'Terminé'}</span>
          : <span>{match.status === 'en_cours' ? 'En cours' : match.status === 'jour_j' ? 'Jour de match' : 'À venir'}</span>}
      </Link>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        {[match.home_team, match.away_team].map((team, index) => (
          <Link key={team.id} href={`/equipes/${team.id}`} aria-label={`Voir l'équipe ${team.name}`} className={`flex min-w-0 items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] ${index === 1 ? 'order-3 flex-row-reverse text-right' : ''}`}>
            <TeamLogo team={team} size={logoSize} className={large ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-10 w-10'} />
            <span className={`truncate font-display text-xl leading-none sm:text-2xl ${team.is_esi ? 'text-[var(--maroon-700)]' : 'text-[var(--ink)]'}`}>{team.is_esi ? 'ESI' : team.name}</span>
          </Link>
        ))}
        <Link href={matchHref} aria-label="Voir les détails du match" className="order-2 rounded font-display text-3xl tabular-nums text-[var(--maroon-700)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] sm:text-4xl">{played ? `${match.home_score}–${match.away_score}` : 'VS'}</Link>
      </div>
      <Link href={matchHref} className="mt-2 block rounded text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">
        {match.round_number && <div className="text-xs font-semibold uppercase tracking-wider text-[var(--gold-deep)]">Journée {match.round_number}</div>}
        {match.public_note && <div className="mt-1 text-sm font-semibold text-[var(--maroon-700)]">{match.public_note}</div>}
        <div className="mt-2 text-xs text-[var(--ink-soft)]">{match.kickoff_confirmed ? match.location || 'Lieu à confirmer' : 'Horaire et lieu à confirmer'}</div>
      </Link>
    </article>
  )
}
