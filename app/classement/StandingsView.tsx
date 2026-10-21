'use client'

import { useRouter } from 'next/navigation'
import type { KeyboardEvent, ReactNode } from 'react'
import type { StandingRow } from '@/lib/data/public'
import TeamLogo from '@/components/TeamLogo'
import EmptyState from '@/components/ui/EmptyState'

const columns = ['Rang', 'Équipe', 'MJ', 'V', 'D', 'PM', 'PE', 'Diff.', 'PTS']

export default function StandingsView({ rows }: { rows: StandingRow[] }) {
  const router = useRouter()

  function openTeam(id: string) {
    router.push(`/equipes/${id}`)
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openTeam(id)
    }
  }

  if (rows.length === 0) return <EmptyState title="Le classement est vide" description="Le classement sera affiché dès que les équipes seront disponibles." />

  return <div className="space-y-4">
    <section aria-label="Tableau du classement" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>{columns.map((column, index) => <th key={column} scope="col" className={`whitespace-nowrap px-3 py-3.5 sm:px-4 ${index < 2 ? 'text-left' : 'text-center'}`}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isEsi = row.team.is_esi
              const qualified = row.rank <= 4
              const difference = row.points_for - row.points_against
              return <tr
                key={row.team_id}
                tabIndex={0}
                aria-label={`Voir le classement de ${isEsi ? 'ESI' : row.team.name}, rang ${row.rank}`}
                onClick={() => openTeam(row.team_id)}
                onKeyDown={(event) => handleRowKeyDown(event, row.team_id)}
                className={`cursor-pointer border-t border-border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${isEsi ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
              >
                <td className={`w-20 whitespace-nowrap px-3 py-3.5 font-display text-xl sm:px-4 ${isEsi ? 'shadow-[inset_4px_0_0_var(--gold)]' : ''}`}>
                  <span className={`mr-2 inline-block size-[7px] rounded-full align-middle ${qualified ? 'bg-success' : 'bg-muted-foreground/50'}`} role="img" aria-label={qualified ? 'Qualifiée' : 'Hors qualification'} />
                  <span className={row.rank === 1 ? 'text-gold' : ''}>{row.rank}</span>
                </td>
                <td className="px-3 py-3.5 sm:px-4">
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamLogo team={row.team} size={28} className="h-7 w-7 shrink-0" />
                    <span className="truncate font-semibold">{isEsi ? 'ESI' : row.team.name}</span>
                  </span>
                </td>
                <td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.played}</td>
                <td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.won}</td>
                <td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.lost}</td>
                <td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.points_for}</td>
                <td className="px-3 py-3.5 text-center tabular-nums sm:px-4">{row.points_against}</td>
                <td className={`px-3 py-3.5 text-center tabular-nums sm:px-4 ${isEsi ? '' : difference > 0 ? 'text-success' : difference < 0 ? 'text-destructive' : ''}`}>{difference > 0 ? `+${difference}` : difference}</td>
                <td className={`px-3 py-3.5 text-center font-display text-xl tabular-nums sm:px-4 ${isEsi ? 'text-gold' : ''}`}>{row.ranking_points}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </section>

    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground" aria-label="Places qualificatives">
      <span className="inline-flex items-center gap-2"><span className="size-[7px] rounded-full bg-success" aria-hidden="true" />Places 1 à 4 : qualifiées pour les demi-finales</span>
      <span className="inline-flex items-center gap-2"><span className="size-[7px] rounded-full bg-muted-foreground/50" aria-hidden="true" />Places 5 à 8 : hors qualification</span>
    </div>

    <InfoCard title="Légende">
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
        {[
          ['MJ', 'Matchs joués'], ['V', 'Victoires'], ['D', 'Défaites'], ['PM', 'Points marqués'],
          ['PE', 'Points encaissés'], ['Diff.', 'PM − PE'], ['PTS', 'Points de classement'],
        ].map(([abbr, definition]) => <div key={abbr}><dt className="font-bold text-foreground">{abbr}</dt><dd className="text-muted-foreground">{definition}</dd></div>)}
      </dl>
    </InfoCard>

    <InfoCard title="Règles du championnat">
      <ul className="space-y-3 text-sm text-foreground">
        <Rule icon={<UsersIcon />}><span>La ligue comprend 8 équipes. Chaque équipe dispute 7 matchs.</span></Rule>
        <Rule icon={<TrophyIcon />}><span>Les 4 premières se qualifient pour les demi-finales.</span></Rule>
        <Rule icon={<ScaleIcon />}>
          <div>
            <p>En cas d&apos;égalité de points, les équipes sont départagées dans cet ordre :</p>
            <ol className="mt-2 flex flex-wrap gap-2">
              <li className="rounded-full bg-muted px-3 py-1"><span className="mr-1 font-bold text-gold">1</span>Goal average</li>
              <li className="rounded-full bg-muted px-3 py-1"><span className="mr-1 font-bold text-gold">2</span>Confrontation directe</li>
            </ol>
            <p className="mt-2 text-muted-foreground">Goal average : points marqués moins points encaissés.</p>
          </div>
        </Rule>
      </ul>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted p-3 text-sm text-muted-foreground">
        <InfoIcon />
        <p>Les places restent provisoires tant que la saison régulière n&apos;est pas terminée.</p>
      </div>
    </InfoCard>
  </div>
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-gold-deep">{title}</h2>
    {children}
  </section>
}

function Rule({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <li className="flex items-start gap-3"><span className="mt-0.5 shrink-0 text-gold">{icon}</span>{children}</li>
}

function UsersIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function TrophyIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8m-4-4v4M7 4h10v7a5 5 0 0 1-10 0V4Z"/><path d="M7 7H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4"/></svg> }
function ScaleIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18m-8 0h16M5 6h14M7 6l-4 7h8L7 6Zm10 0-4 7h8l-4-7Z"/></svg> }
function InfoIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg> }
