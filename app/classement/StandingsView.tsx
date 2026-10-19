import Link from 'next/link'
import type { StandingRow } from '@/lib/data/public'
import TeamLogo from '@/components/TeamLogo'
import EmptyState from '@/components/ui/EmptyState'

export default function StandingsView({ rows }: { rows: StandingRow[] }) {
  const headers = ['#', 'Équipe', 'J', 'V', 'D', 'PP', 'PC', 'Diff', 'Pts']

  if (rows.length === 0) return <EmptyState title="Le classement est vide" description="Le classement sera affiché dès que les équipes seront disponibles." />

  return (
    <section className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead className="bg-[var(--line)]/35 text-xs uppercase text-[var(--ink-soft)]"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 text-left">{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team_id} className={`border-t border-[var(--line)] transition-colors hover:bg-[var(--line)]/30 ${row.team.is_esi ? 'bg-[var(--maroon-900)] text-white' : ''}`}>
              <td className="px-3 py-2 font-display text-xl">{row.rank}</td>
              <td className="px-3 py-2">
                <Link href={`/equipes/${row.team_id}`} className={`flex w-fit items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] ${row.team.is_esi ? 'text-white' : 'text-[var(--ink)]'}`}>
                  <TeamLogo team={row.team} size={32} className="h-8 w-8" />
                  <span className="font-semibold">{row.team.is_esi ? 'ESI' : row.team.name}</span>
                </Link>
              </td>
              <td className="px-3 py-2 tabular-nums">{row.played}</td><td className="px-3 py-2 tabular-nums">{row.won}</td><td className="px-3 py-2 tabular-nums">{row.lost}</td>
              <td className="px-3 py-2 tabular-nums">{row.points_for}</td><td className="px-3 py-2 tabular-nums">{row.points_against}</td>
              <td className="px-3 py-2 tabular-nums">{row.difference > 0 ? '+' : ''}{row.difference}</td><td className="px-3 py-2 font-display text-xl tabular-nums">{row.ranking_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
