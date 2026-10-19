import PublicNav from '@/components/PublicNav'
import { news } from '@/lib/data/news'
import { createClient } from '@/lib/supabase/server'

export default async function ActualitesPage() {
  const supabase = await createClient()
  const { data: hallOfFame } = await supabase.from('hall_of_fame')
    .select('year,title,description').order('year', { ascending: false })
  const mvp = news.find((item) => item.tag === 'MVP')

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-screen-xl space-y-7 px-4 pb-28 pt-7 sm:px-6 lg:px-10">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-deep)]">Le journal des Lions</p>
          <h1 className="mt-1 font-display text-4xl uppercase leading-none text-[var(--maroon-900)] sm:text-5xl">Actualités</h1>
        </header>

        {mvp && <section className="rounded-2xl bg-[var(--gold-500)] p-5 text-[var(--maroon-900)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.24em]">MVP de la semaine</p>
          <h2 className="mt-2 font-display text-4xl leading-none sm:text-6xl">{mvp.title.replace('MVP de la semaine : ', '')}</h2>
          <p className="mt-2 font-semibold">{mvp.body}</p>
        </section>}

        <section aria-labelledby="latest-news-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Le journal des Lions</p>
              <h2 id="latest-news-title" className="font-display text-2xl uppercase text-[var(--maroon-900)] sm:text-3xl">À la une</h2>
            </div>
          </div>
          <div className="flex snap-x gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-3 md:overflow-visible">
            {news.map((item) => <article key={item.id} className="min-h-52 min-w-[270px] snap-start rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 md:min-w-0">
              <span className="rounded bg-[var(--gold-500)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--maroon-900)]">{item.tag}</span>
              <h3 className="mt-4 font-display text-xl leading-snug text-[var(--maroon-900)]">{item.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
            </article>)}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
          <h2 className="font-display text-3xl text-[var(--maroon-900)]">À propos</h2>
          <p className="mt-2 max-w-4xl leading-relaxed text-[var(--ink-soft)]">Fondée par les étudiants de l’École Supérieure d’Industrie, l’équipe « The Lions of ESI » porte les couleurs bordeaux et or dans la compétition Inter-Écoles de l’INP-HB.</p>
          <h3 className="mt-6 font-display text-2xl text-[var(--maroon-900)]">Hall of Fame</h3>
          {hallOfFame?.length ? <div className="mt-2 divide-y divide-[var(--line)]">
            {hallOfFame.map((entry) => <article key={`${entry.year}-${entry.title}`} className="flex gap-4 py-3">
              <span className="font-display text-2xl text-[var(--gold-deep)]">{entry.year}</span>
              <div><h4 className="font-semibold text-[var(--maroon-900)]">{entry.title}</h4>{entry.description && <p className="mt-1 text-sm text-[var(--ink-soft)]">{entry.description}</p>}</div>
            </article>)}
          </div> : <p className="mt-2 text-sm text-[var(--ink-soft)]">Le Hall of Fame sera affiché ici dès que ses distinctions auront été renseignées.</p>}
        </section>
      </main>
    </>
  )
}
