import type { PublishedNews } from '@/lib/data/public'

export default function NewsCards({ items }: { items: PublishedNews[] }) {
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Aucune actualité n’a encore été publiée.</p>
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className="theme-card flex min-h-[230px] min-w-0 flex-col rounded-xl border border-border bg-card p-5">
          <span className="inline-flex self-start rounded-md bg-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-foreground">
            {item.category || 'Actualité'}
          </span>
          <h3 className="mt-4 line-clamp-2 text-xl font-semibold leading-snug text-brand">{item.title}</h3>
          <p className="mt-2 line-clamp-3 text-base leading-relaxed text-muted-foreground">{item.excerpt || item.body}</p>
        </article>
      ))}
    </div>
  )
}
