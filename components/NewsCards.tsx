import Link from 'next/link'
import type { PublishedNews } from '@/lib/data/public'

export default function NewsCards({ items }: { items: PublishedNews[] }) {
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Aucune actualité n’a encore été publiée.</p>
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const card = (
          <>
            <span className="inline-flex self-start rounded-md bg-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-foreground">
              {item.category || 'Actualité'}
            </span>
            <h3 className="mt-4 line-clamp-2 text-xl font-semibold leading-snug text-brand">{item.title}</h3>
            <p className="mt-2 line-clamp-3 text-base leading-relaxed text-muted-foreground">{item.excerpt || item.body}</p>
            {item.body && <span className="mt-auto pt-3 text-sm font-bold text-brand">Lire l’article →</span>}
          </>
        )
        const cardClass = 'theme-card flex min-h-[230px] min-w-0 flex-col rounded-xl border border-border bg-card p-5'
        return item.body
          ? <Link key={item.id} href={`/actualites/${item.id}`} className={`${cardClass} transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]`}>{card}</Link>
          : <article key={item.id} className={cardClass}>{card}</article>
      })}
    </div>
  )
}
