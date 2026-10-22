import PublicNav from '@/components/PublicNav'
import { getPublishedNews } from '@/lib/data/public'
import PageTitle from '@/components/PageTitle'
import NewsCards from '@/components/NewsCards'
import { withNewsFallback } from '@/lib/data/news-fallback'

const achievements = [
  { value: '4', label: 'titres Inter-Écoles' },
  { value: '2', label: 'finales disputées' },
  { value: '2026', label: 'podium' },
]

export default async function ActualitesPage() {
  const news = withNewsFallback(await getPublishedNews(30))

  return (
    <>
      <PublicNav />
      <main className="reference-page-shell page-title-page mx-auto max-w-screen-xl space-y-7 px-4 pb-28 pt-7 sm:px-6 lg:px-10">
        <PageTitle title="Actualités" subtitle="Le journal des Lions" />

        <section aria-labelledby="latest-news-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="latest-news-title" className="font-display text-2xl uppercase text-brand sm:text-3xl">À la une</h2>
            </div>
          </div>
          <NewsCards items={news} />
        </section>

        <section aria-labelledby="about-title" className="rounded-2xl border border-border bg-card p-5 sm:p-7 lg:p-8">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">Notre histoire</p>
            <h2 id="about-title" className="mt-3 max-w-3xl font-display text-3xl leading-tight text-brand sm:text-4xl">
              Il y a des équipes qui jouent pour un trophée, et d’autres qui jouent pour un nom.
              <span className="mt-1 block text-gold-deep">Les Lions de l’ESI jouent pour les deux.</span>
            </h2>

            <div className="my-6 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
              {achievements.map((item) => <div key={item.label} className="rounded-xl border border-border bg-muted px-2 py-3 text-center sm:px-4 sm:py-4">
                <p className="font-display text-3xl leading-none text-gold-deep sm:text-4xl">{item.value}</p>
                <p className="mt-1 text-xs font-semibold leading-tight text-muted-foreground sm:text-sm">{item.label}</p>
              </div>)}
            </div>

            <div className="max-w-4xl space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-7">
              <p>Depuis 2014, l’ESI Basketball écrit son histoire sur les parquets de l’INP-HB : quatre titres Inter-Écoles (2014, 2015, 2017 et 2019), deux finales disputées jusqu’au bout (2016 et 2024) et une place sur le podium en 2026. Chaque saison a laissé ses souvenirs, et chaque promotion a transmis à la suivante plus qu’un maillot : une exigence.</p>
              <p>Cette saison 2026-2027, nous repartons avec la même faim et une conviction simple : on ne gagne pas seul. Dix-sept Lions, venus d’horizons différents, portent les mêmes couleurs et les mêmes ambitions. Nous y mettrons de la rigueur à l’entraînement, de la solidarité sur le terrain et du respect pour nos adversaires, pour l’institut et pour tous ceux qui ont porté ce maillot avant nous.</p>
              <p>Cette application est faite pour vous suivre au plus près : le calendrier, les résultats, le classement et la composition de l’équipe. Elle est aussi la mémoire vivante d’un club qui sait d’où il vient.</p>
              <p>À tous nos supporters, anciens joueurs et étudiants de l’École Supérieure d’Industrie : merci de votre soutien. Venez remplir les tribunes, on s’occupe du reste.</p>
            </div>
            <p className="mt-5 border-t border-border pt-4 text-sm font-semibold text-brand">L’équipe de l’ESI Basketball Homme</p>
          </div>
        </section>
      </main>
    </>
  )
}
