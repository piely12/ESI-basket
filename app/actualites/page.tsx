import PublicNav from '@/components/PublicNav'
import { getPublishedNews } from '@/lib/data/public'
import PageTitle from '@/components/PageTitle'
import NewsCards from '@/components/NewsCards'
import { withNewsFallback } from '@/lib/data/news-fallback'

export default async function ActualitesPage() {
  const news = withNewsFallback(await getPublishedNews(30))

  return (
    <>
      <PublicNav />
      <main className="reference-page-shell page-title-page mx-auto max-w-screen-xl space-y-7 px-4 pb-28 pt-7 sm:px-6 lg:px-10">
        <PageTitle title="Actualités" subtitle="Le journal des Lions" />

        <section aria-labelledby="latest-news-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="latest-news-title" className="font-display text-2xl uppercase text-brand sm:text-3xl">À la une</h2>
          </div>
          <NewsCards items={news} />
        </section>
      </main>
    </>
  )
}
