import Link from 'next/link'
import type { StandingRow } from '@/lib/data/public'
import TeamLogo from '@/components/TeamLogo'
import EmptyState from '@/components/ui/EmptyState'

export default function StandingsView({ rows }: { rows: StandingRow[] }) {
  const headers = ['#', 'École', 'J', 'V', 'D', 'PP', 'PC', 'Diff', 'Pts']

  if (rows.length === 0) return <EmptyState title="Le classement est vide" description="Le classement sera affiché dès que les équipes seront disponibles." />

  return (
    <section className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-5">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="bg-[#f2ebe2] text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
          <tr>{headers.map((header, index) => <th key={header} className={`px-3 py-3.5 sm:px-4 ${index < 2 ? 'text-left' : 'text-center'}`}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team_id} className={`border-b border-[var(--line)] last:border-b-0 ${row.team.is_esi ? 'bg-[var(--maroon-900)] text-white' : 'text-[var(--ink)] transition-colors hover:bg-[var(--line)]/20'}`}>
              <td className="w-14 px-3 py-3.5 font-display text-2xl sm:px-4">{row.rank}</td>
              <td className="px-3 py-3.5 sm:px-4">
                <Link href={`/equipes/${row.team_id}`} className={`flex w-fit items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] ${row.team.is_esi ? 'text-white' : 'text-[var(--ink)]'}`}>
                  <TeamLogo team={row.team} size={40} className="h-10 w-10" />
                  <span className="font-display text-lg font-semibold uppercase">{row.team.is_esi ? 'ESI' : row.team.name}</span>
                </Link>
              </td>
              <td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.played}</td><td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.won}</td><td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.lost}</td>
              <td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.points_for}</td><td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.points_against}</td>
              <td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.difference > 0 ? '+' : ''}{row.difference}</td><td className={`px-3 py-3.5 text-center font-display text-2xl tabular-nums sm:px-4 ${row.team.is_esi ? 'text-[var(--gold-500)]' : ''}`}>{row.ranking_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
