import Image from 'next/image'
import PublicNav from '@/components/PublicNav'
import { getPublishedNews } from '@/lib/data/public'
import PageTitle from '@/components/PageTitle'

const achievements = [
  { value: '4', label: 'titres Inter-Écoles' },
  { value: '2', label: 'finales disputées' },
  { value: '2026', label: 'podium' },
]

export default async function ActualitesPage() {
  const news = await getPublishedNews(30)
  const mvp = news.find((item) => item.category?.toLowerCase() === 'mvp')

  return (
    <>
      <PublicNav />
      <main className="reference-page-shell page-title-page mx-auto max-w-screen-xl space-y-7 px-4 pb-28 pt-7 sm:px-6 lg:px-10">
        <PageTitle title="Actualités" subtitle="Le journal des Lions" />

        {mvp && <section className="rounded-2xl bg-maroon-panel p-5 text-on-brand sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">À la une · MVP</p>
          <h2 className="mt-2 font-display text-4xl leading-none text-gold sm:text-6xl">{mvp.title}</h2>
          <p className="mt-2 font-semibold">{mvp.excerpt || mvp.body}</p>
        </section>}

        <section aria-labelledby="latest-news-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Le journal des Lions</p>
              <h2 id="latest-news-title" className="font-display text-2xl uppercase text-brand sm:text-3xl">À la une</h2>
            </div>
          </div>
          {news.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
              {item.cover_url && <Image src={item.cover_url} alt="" width={800} height={450} unoptimized className="aspect-video w-full object-cover" />}
              <div className="min-h-48 p-5">
                <div className="flex items-center justify-between gap-2"><span className="rounded bg-gold px-2 py-1 text-[10px] font-bold uppercase text-gold-foreground">{item.category || 'Actualité'}</span>{item.published_at && <time className="text-xs text-muted-foreground" dateTime={item.published_at}>{new Date(item.published_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan', day: 'numeric', month: 'long', year: 'numeric' })}</time>}</div>
                <h3 className="mt-4 font-display text-xl leading-snug text-brand">{item.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">{item.excerpt || item.body}</p>
              </div>
            </article>)}
          </div> : <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Aucune actualité n’a encore été publiée.</p>}
        </section>

        <section aria-labelledby="about-title" className="relative isolate overflow-hidden rounded-3xl border border-gold/35 bg-primary p-5 text-primary-foreground shadow-xl sm:p-8 lg:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 z-0 size-64 -translate-y-1/2 opacity-[0.12] sm:right-4 sm:size-80">
            <Image src="/logos/esi.png" alt="" fill sizes="320px" className="object-contain" />
          </div>
          <div className="relative z-10 max-w-4xl">
            <p className="inline-flex rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gold">Notre histoire</p>
            <h2 id="about-title" className="mt-4 max-w-3xl font-display text-4xl leading-[0.95] text-primary-foreground sm:text-5xl lg:text-6xl">
              Il y a des équipes qui jouent pour un trophée, et d’autres qui jouent pour un nom.
              <span className="mt-2 block text-gold">Les Lions de l’ESI jouent pour les deux.</span>
            </h2>

            <div className="my-7 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
              {achievements.map((item) => <div key={item.label} className="rounded-2xl border border-gold/25 bg-gold-soft px-2 py-3 text-center sm:px-4 sm:py-4">
                <p className="font-display text-3xl leading-none text-gold sm:text-4xl">{item.value}</p>
                <p className="mt-1 text-xs font-semibold leading-tight text-primary-foreground sm:text-sm">{item.label}</p>
              </div>)}
            </div>

            <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-primary-foreground sm:text-base">
              <p>Depuis 2014, l’ESI Basketball écrit son histoire sur les parquets de l’INP-HB : quatre titres Inter-Écoles (2014, 2015, 2017 et 2019), deux finales disputées jusqu’au bout (2016 et 2024) et une place sur le podium en 2026. Chaque saison a laissé ses souvenirs, et chaque promotion a transmis à la suivante plus qu’un maillot : une exigence.</p>
              <p>Cette saison 2026-2027, nous repartons avec la même faim et une conviction simple : on ne gagne pas seul. Dix-sept Lions, venus d’horizons différents, portent les mêmes couleurs et les mêmes ambitions. Nous y mettrons de la rigueur à l’entraînement, de la solidarité sur le terrain et du respect pour nos adversaires, pour l’institut et pour tous ceux qui ont porté ce maillot avant nous.</p>
              <p>Cette application est faite pour vous suivre au plus près : le calendrier, les résultats, le classement et la composition de l’équipe. Elle est aussi la mémoire vivante d’un club qui sait d’où il vient.</p>
              <p>À tous nos supporters, anciens joueurs et étudiants de l’École Supérieure d’Industrie : merci de votre soutien. Venez remplir les tribunes, on s’occupe du reste.</p>
            </div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-gold">L’équipe de l’ESI Basketball Homme</p>
          </div>
        </section>
      </main>
    </>
  )
}
