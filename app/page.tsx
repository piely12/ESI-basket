import Link from 'next/link'
import Image from 'next/image'
import PublicNav from '@/components/PublicNav'
import MatchCard from '@/components/MatchCard'
import TeamLogo from '@/components/TeamLogo'
import { getNextMatch, getLastResult, getStandings } from '@/lib/data/public'

export default async function Home() {
  const [nextMatch, lastResult, standings] = await Promise.all([
    getNextMatch(), getLastResult(), getStandings(),
  ])
  const esiIndex = standings.findIndex((row) => row.team.is_esi)
  const esiStanding = esiIndex >= 0 ? standings[esiIndex] : null
  const record = esiStanding ? `${esiStanding.won}-${esiStanding.lost}` : '—'
  const rank = esiIndex >= 0 ? esiIndex + 1 : null

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-28 pt-6 sm:px-5">
        <section className="relative overflow-hidden rounded-xl bg-[var(--maroon-900)] p-6 text-[var(--paper)] sm:p-8 md:p-10">
          <Image src="/logos/esi.png" alt="" width={288} height={288} priority className="pointer-events-none absolute -right-10 -top-6 h-52 w-52 object-contain opacity-[0.14] sm:h-64 sm:w-64 md:h-72 md:w-72" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--gold-500)] sm:text-xs sm:tracking-[0.3em]">Inter-Écoles INP-HB · Saison</p>
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
              <Link href="/matchs" className="text-xs font-bold uppercase tracking-wide text-[var(--maroon-700)]">Calendrier →</Link>
            </div>
            {nextMatch ? <MatchCard match={nextMatch} large /> : <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Le prochain rendez-vous des Lions sera annoncé ici.</div>}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-2xl text-[var(--maroon-900)]">Dernier résultat</h2>
              <Link href="/matchs" className="text-xs font-bold uppercase tracking-wide text-[var(--maroon-700)]">Tous les matchs →</Link>
            </div>
            {lastResult ? <MatchCard match={lastResult} large /> : <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Les résultats des Lions apparaîtront après le premier match.</div>}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-3xl text-[var(--maroon-900)]">Actualités</h2>
            <Link href="/actualites" className="text-sm font-semibold text-[var(--maroon-700)]">Tout voir →</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 md:col-span-3">
              <span className="rounded bg-[var(--gold-500)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--maroon-900)]">The Lions of ESI</span>
              <h3 className="mt-3 font-display text-2xl text-[var(--maroon-900)]">Les nouvelles des Lions arrivent bientôt</h3>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">Les actualités publiées par l’équipe apparaîtront ici.</p>
            </article>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-3xl text-[var(--maroon-900)]">Les écoles en lice</h2>
            <Link href="/classement" className="text-sm font-semibold text-[var(--maroon-700)]">Classement →</Link>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
            {standings.map((row) => (
              <div key={row.team_id} className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)]/70 p-2 text-center">
                <TeamLogo team={row.team} size={56} className="h-12 w-12 sm:h-14 sm:w-14" />
                <span className="w-full truncate text-[10px] font-bold uppercase">{row.team.name}</span>
              </div>
            ))}
            {standings.length === 0 && <p className="col-span-full rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-soft)]">Les équipes de la compétition seront affichées ici.</p>}
          </div>
        </section>
      </main>
    </>
  )
}
