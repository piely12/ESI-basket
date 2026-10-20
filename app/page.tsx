import Link from 'next/link'
import Image from 'next/image'
import PublicNav from '@/components/PublicNav'
import MatchCard from '@/components/MatchCard'
import { getNextMatch, getLastResult, getStandings, getTeams } from '@/lib/data/public'
import { news } from '@/lib/data/news'
import TeamLogo from '@/components/TeamLogo'

export default async function Home() {
  const [nextMatch, lastResult, standings, teams] = await Promise.all([
    getNextMatch(), getLastResult(), getStandings(), getTeams(),
  ])
  const esiIndex = standings.findIndex((row) => row.team.is_esi)
  const esiStanding = esiIndex >= 0 ? standings[esiIndex] : null
  const record = esiStanding ? `${esiStanding.won}-${esiStanding.lost}` : '—'
  const rank = esiStanding?.rank ?? null

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-screen-xl space-y-8 px-4 pb-28 pt-6 sm:px-6 lg:px-10">
        <section className="relative overflow-hidden rounded-xl bg-[var(--maroon-900)] p-6 text-[var(--paper)] sm:p-8 md:p-10">
          <Image src="/logos/esi.png" alt="" width={400} height={400} priority className="pointer-events-none absolute -right-10 -top-6 h-52 w-52 object-contain opacity-[0.14] sm:h-64 sm:w-64 md:h-72 md:w-72" />
          <div className="relative">
            <h1 className="mt-3 font-display text-6xl leading-[0.88] tracking-wide text-white sm:text-7xl md:text-8xl">Rugir.<br /><span className="text-[var(--gold-500)]">Ensemble.</span></h1>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-4 sm:gap-x-10">
              <div><div className="font-display text-4xl text-[var(--gold-500)]">{rank ? <>{rank}<sup className="text-lg">e</sup></> : '—'}</div><div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Classement</div></div>
              <div><div className="font-display text-4xl text-[var(--gold-500)]">{record}</div><div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Victoires · défaites</div></div>
              <div><div className="font-display text-4xl text-[var(--gold-500)]">17</div><div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Lions</div></div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-2xl text-[var(--maroon-900)]">Prochain match</h2>
              <Link href="/matchs" className="text-xs font-bold uppercase tracking-wide text-[var(--maroon-700)]">Calendrier</Link>
            </div>
            {nextMatch ? <MatchCard match={nextMatch} large /> : <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Le prochain rendez-vous des Lions sera annoncé ici.</div>}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-2xl text-[var(--maroon-900)]">Dernier résultat</h2>
              <Link href="/matchs" className="text-xs font-bold uppercase tracking-wide text-[var(--maroon-700)]">Tous les matchs</Link>
            </div>
            {lastResult ? <MatchCard match={lastResult} large /> : <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Les résultats des Lions apparaîtront après le premier match.</div>}
          </div>
        </section>

        {news.length > 0 && <section aria-labelledby="news-title" className="pt-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="news-title" className="font-display text-2xl uppercase tracking-wide text-[var(--maroon-900)]">Actualités</h2>
            <Link href="/actualites" className="shrink-0 text-sm font-semibold text-[var(--maroon-700)]">Tout voir</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {news.map((item) => <article key={item.id} className="min-h-48 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <span className="inline-flex rounded-md bg-[var(--gold-500)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--maroon-900)]">{item.tag}</span>
              <h3 className="mt-4 font-display text-xl leading-snug text-[var(--maroon-900)]">{item.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
            </article>)}
          </div>
        </section>}

        <section aria-labelledby="schools-title" className="pt-1">
          <h2 id="schools-title" className="mb-3 font-display text-2xl uppercase tracking-wide text-[var(--maroon-900)]">Les écoles en lice</h2>
          <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-8 sm:gap-x-4">
            {teams.map((team) => (
              <Link key={team.id} href={`/equipes/${team.id}`} aria-label={`Voir l'équipe ${team.name}`} className="flex min-w-0 flex-col items-center justify-start gap-1 rounded-lg p-2 transition hover:bg-[var(--line)]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">
                <TeamLogo team={team} size={88} className="h-12 w-12 sm:h-16 sm:w-16" />
                <span className="text-center text-[10px] font-semibold uppercase leading-tight text-[var(--maroon-900)]">{team.is_esi ? 'ESI' : team.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
