import Image from 'next/image'
import PublicNav from '@/components/PublicNav'
import { createClient } from '@/lib/supabase/server'
import { getPublishedNews } from '@/lib/data/public'

export default async function ActualitesPage() {
  const supabase = await createClient()
  const [news, hallOfFameResult] = await Promise.all([
    getPublishedNews(30),
    supabase.from('hall_of_fame').select('year,title,description').order('year', { ascending: false }),
  ])
  const mvp = news.find((item) => item.category?.toLowerCase() === 'mvp')
  const hallOfFame = hallOfFameResult.data

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-screen-xl space-y-7 px-4 pb-28 pt-7 sm:px-6 lg:px-10">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand">Le journal des Lions</p>
          <h1 className="mt-1 font-display text-4xl uppercase leading-none text-brand sm:text-5xl">Actualités</h1>
        </header>

        {mvp && <section className="rounded-2xl bg-maroon-panel p-5 text-on-brand sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-500)]">À la une · MVP</p>
          <h2 className="mt-2 font-display text-4xl leading-none text-[var(--gold-500)] sm:text-6xl">{mvp.title}</h2>
          <p className="mt-2 font-semibold">{mvp.excerpt || mvp.body}</p>
        </section>}

        <section aria-labelledby="latest-news-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Le journal des Lions</p>
              <h2 id="latest-news-title" className="font-display text-2xl uppercase text-brand sm:text-3xl">À la une</h2>
            </div>
          </div>
          {news.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              {item.cover_url && <Image src={item.cover_url} alt="" width={800} height={450} unoptimized className="aspect-video w-full object-cover" />}
              <div className="min-h-48 p-5">
                <div className="flex items-center justify-between gap-2"><span className="rounded bg-[var(--gold-500)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--maroon-panel)]">{item.category || 'Actualité'}</span>{item.published_at && <time className="text-xs text-[var(--ink-soft)]" dateTime={item.published_at}>{new Date(item.published_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan', day: 'numeric', month: 'long', year: 'numeric' })}</time>}</div>
                <h3 className="mt-4 font-display text-xl leading-snug text-brand">{item.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--ink-soft)]">{item.excerpt || item.body}</p>
              </div>
            </article>)}
          </div> : <p className="rounded-xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--ink-soft)]">Aucune actualité n’a encore été publiée.</p>}
        </section>

        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
          <h2 className="font-display text-3xl text-brand">À propos</h2>
          <p className="mt-2 max-w-4xl leading-relaxed text-[var(--ink-soft)]">Fondée par les étudiants de l’École Supérieure d’Industrie, l’équipe « The Lions of ESI » porte les couleurs bordeaux et or dans la compétition Inter-Écoles de l’INP-HB.</p>
          <h3 className="mt-6 font-display text-2xl text-brand">Hall of Fame</h3>
          {hallOfFame?.length ? <div className="mt-2 divide-y divide-[var(--line)]">
            {hallOfFame.map((entry) => <article key={`${entry.year}-${entry.title}`} className="flex gap-4 py-3">
              <span className="font-display text-2xl text-[var(--gold-deep)]">{entry.year}</span>
              <div><h4 className="font-semibold text-brand">{entry.title}</h4>{entry.description && <p className="mt-1 text-sm text-[var(--ink-soft)]">{entry.description}</p>}</div>
            </article>)}
          </div> : <p className="mt-2 text-sm text-[var(--ink-soft)]">Le Hall of Fame apparaîtra lorsque ses distinctions auront été renseignées.</p>}
        </section>
      </main>
    </>
  )
}
