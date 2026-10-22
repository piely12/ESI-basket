import Link from 'next/link'
import Image from 'next/image'
import PublicNav from '@/components/PublicNav'
import MatchCard from '@/components/MatchCard'
import { getNextMatch, getLastResult, getStandings, getTeams, getPublishedNews } from '@/lib/data/public'
import TeamLogo from '@/components/TeamLogo'
import NewsCards from '@/components/NewsCards'
import { withNewsFallback } from '@/lib/data/news-fallback'

export default async function Home() {
  const [nextMatch, lastResult, standings, teams, news] = await Promise.all([
    getNextMatch(), getLastResult(), getStandings(), getTeams(), getPublishedNews(3),
  ])
  const homeNews = withNewsFallback(news)
  const esiIndex = standings.findIndex((row) => row.team.is_esi)
  const esiStanding = esiIndex >= 0 ? standings[esiIndex] : null
  const record = esiStanding ? `${esiStanding.won}-${esiStanding.lost}` : '—'
  const rank = esiStanding?.rank ?? null

  return (
    <>
      <PublicNav />
      <main className="mx-auto w-full max-w-screen-xl space-y-8 px-4 pb-28 pt-6 sm:px-6 lg:px-10">
        <section className="home-hero relative min-w-0">
          <Image src="/images/home-hero-lion.jpg" alt="" width={478} height={532} priority className="home-hero-lion" />
          <p className="home-hero-kicker">SAISON 2026-2027</p>
          <h1 className="home-hero-title">WE ARE<span>THE LIONS.</span></h1>
          <div className="home-hero-stats">
            <div><b>{rank ? <>{rank}<sup>e</sup></> : '—'}</b><small>Classement</small></div>
            <div><b>{record}</b><small>Bilan</small></div>
            <div><b>17</b><small>Lions</small></div>
          </div>
        </section>

        <section className="grid min-w-0 gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-2xl text-brand">Prochain match</h2>
              <Link href="/matchs" className="text-xs font-bold uppercase tracking-wide text-brand">Calendrier</Link>
            </div>
            {nextMatch ? <MatchCard match={nextMatch} large /> : <div className="theme-card rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Le prochain rendez-vous des Lions sera annoncé ici.</div>}
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-2xl text-brand">Dernier résultat</h2>
              <Link href="/matchs" className="text-xs font-bold uppercase tracking-wide text-brand">Tous les matchs</Link>
            </div>
            {lastResult ? <MatchCard match={lastResult} large /> : <div className="theme-card rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Les résultats des Lions apparaîtront après le premier match.</div>}
          </div>
        </section>

        <section aria-labelledby="news-title" className="pt-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="news-title" className="font-display text-2xl uppercase tracking-wide text-brand">Actualités</h2>
            <Link href="/actualites" className="shrink-0 text-sm font-semibold text-brand">Tout voir →</Link>
          </div>
          <NewsCards items={homeNews} />
        </section>

        <section aria-labelledby="schools-title" className="pt-1">
          <h2 id="schools-title" className="mb-3 font-display text-2xl uppercase tracking-wide text-brand">Les écoles en lice</h2>
          <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-8 sm:gap-x-4">
            {teams.map((team) => (
              <Link key={team.id} href={`/equipes/${team.id}`} aria-label={`Voir l'équipe ${team.name}`} className="flex min-w-0 flex-col items-center justify-start gap-1 rounded-lg p-2 transition hover:bg-[var(--line)]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">
                <TeamLogo team={team} size={88} className="h-12 w-12 sm:h-16 sm:w-16" />
                <span className="text-center text-[10px] font-semibold uppercase leading-tight text-brand">{team.is_esi ? 'ESI' : team.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
