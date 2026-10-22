import Link from 'next/link'
import Image from 'next/image'
import PublicNav from '@/components/PublicNav'
import MatchCard from '@/components/MatchCard'
import { getNextMatch, getLastResult, getStandings, getTeams, getPublishedNews } from '@/lib/data/public'
import TeamLogo from '@/components/TeamLogo'

export default async function Home() {
  const [nextMatch, lastResult, standings, teams, news] = await Promise.all([
    getNextMatch(), getLastResult(), getStandings(), getTeams(), getPublishedNews(3),
  ])
  const esiIndex = standings.findIndex((row) => row.team.is_esi)
  const esiStanding = esiIndex >= 0 ? standings[esiIndex] : null
  const record = esiStanding ? `${esiStanding.won}-${esiStanding.lost}` : '—'
  const rank = esiStanding?.rank ?? null

  return (
    <>
      <PublicNav />
      <main className="mx-auto w-full max-w-screen-xl space-y-8 px-4 pb-28 pt-6 sm:px-6 lg:px-10">
        <section className="hero-panel relative min-w-0 overflow-hidden rounded-xl bg-primary p-5 text-primary-foreground sm:p-8 md:p-10">
          <Image src="/logos/esi.png" alt="" width={400} height={400} priority className="pointer-events-none absolute -right-10 -top-6 h-52 w-52 object-contain opacity-[0.14] sm:h-64 sm:w-64 md:h-72 md:w-72" />
          <div className="relative min-w-0">
            <h1 className="mt-3 font-display text-[clamp(3rem,12vw,3.75rem)] leading-[0.88] tracking-wide text-primary-foreground sm:text-7xl md:text-8xl">Rugir.<br /><span className="text-gold">Ensemble.</span></h1>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-4 sm:gap-x-10">
              <div><div className="font-display text-4xl text-gold">{rank ? <>{rank}<sup className="text-lg">e</sup></> : '—'}</div><div className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/85">Classement</div></div>
              <div><div className="font-display text-4xl text-gold">{record}</div><div className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/85">Victoires · défaites</div></div>
              <div><div className="font-display text-4xl text-gold">17</div><div className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/85">Lions</div></div>
            </div>
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
            <Link href="/actualites" className="shrink-0 text-sm font-semibold text-brand">Tout voir</Link>
          </div>
          {news.length ? <div className="grid min-w-0 gap-3 md:grid-cols-3">
            {news.map((item) => <article key={item.id} className="theme-card min-h-48 min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between gap-2"><span className="inline-flex rounded-md bg-[var(--gold-500)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--maroon-panel)]">{item.category || 'Actualité'}</span>{item.published_at && <time className="text-xs text-[var(--ink-soft)]" dateTime={item.published_at}>{new Date(item.published_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan', day: 'numeric', month: 'short' })}</time>}</div>
              <h3 className="mt-4 font-display text-xl leading-snug text-brand">{item.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-[var(--ink-soft)]">{item.excerpt || item.body}</p>
            </article>)}
          </div> : <p className="theme-card rounded-xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--ink-soft)]">Aucune actualité n’a encore été publiée.</p>}
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
