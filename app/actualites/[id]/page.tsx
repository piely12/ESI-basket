import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicNav from '@/components/PublicNav'
import NewsBody from '@/components/NewsBody'
import { getPublishedNews } from '@/lib/data/public'
import { withNewsFallback } from '@/lib/data/news-fallback'

export default async function ActualitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = withNewsFallback(await getPublishedNews(30)).find((news) => news.id === id)
  if (!item || !item.body) notFound()
  const date = item.published_at
    ? new Date(item.published_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-7 sm:px-6">
        <Link href="/actualites" className="inline-flex min-h-10 items-center gap-2 rounded text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">← Actualités</Link>
        <article className="mt-3">
          <span className="inline-flex rounded-md bg-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-foreground">{item.category || 'Actualité'}</span>
          <h1 className="mt-4 font-display text-4xl uppercase leading-[1.02] text-brand sm:text-5xl">{item.title}</h1>
          {date && <p className="mt-2 text-sm text-muted-foreground">{date}</p>}
          <div aria-hidden="true" className="my-5 h-1 w-16 rounded bg-gold" />
          <NewsBody body={item.body} />
        </article>
      </main>
    </>
  )
}
