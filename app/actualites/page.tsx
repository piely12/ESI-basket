import Image from 'next/image'
import Link from 'next/link'
import PublicNav from '@/components/PublicNav'
import EmptyState from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase/server'

type NewsRow = {
  id: string
  title: string
  excerpt: string | null
  body: string
  category: string | null
  cover_url: string | null
  published_at: string | null
}

type MediaRow = { news_id: string; media_url: string; media_type: 'image' | 'video'; caption: string | null }

const formatDate = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Abidjan',
}).format(new Date(value))

function safeSupabaseAsset(value: string | null): string | null {
  if (!value || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  try {
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const media = new URL(value)
    if (media.protocol !== 'https:' || media.origin !== base.origin || !media.pathname.startsWith('/storage/v1/object/public/')) return null
    return media.toString()
  } catch { return null }
}

export default async function ActualitesPage() {
  const supabase = await createClient()
  const { data: esi } = await supabase.from('teams').select('id').eq('is_esi', true).maybeSingle()
  const [newsResult, latestMatchResult] = await Promise.all([
    supabase.from('news').select('id,title,excerpt,body,category,cover_url,published_at')
      .eq('is_published', true).order('published_at', { ascending: false }).limit(20),
    esi
      ? supabase.from('matches').select('id,scheduled_at').eq('status', 'termine')
        .or(`home_team_id.eq.${esi.id},away_team_id.eq.${esi.id}`)
        .order('scheduled_at', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  const articles = (newsResult.data ?? []) as NewsRow[]
  const latestMatch = latestMatchResult.data
  let mvp: { id: string; player_id: string; headline: string | null; published_at: string | null } | null = null
  let mvpPlayer: { first_name: string; last_name: string; jersey_number: number | null; photo_url: string | null } | null = null
  let mvpStats: { points: number | null; rebounds: number | null; assists: number | null } | null = null
  if (latestMatch) {
    const { data: award } = await supabase.from('mvp_awards').select('id,player_id,headline,published_at')
      .eq('match_id', latestMatch.id).not('published_at', 'is', null).maybeSingle()
    mvp = award
    if (award) {
      const [{ data: player }, { data: stats }] = await Promise.all([
        supabase.from('players').select('first_name,last_name,jersey_number,photo_url').eq('id', award.player_id).maybeSingle(),
        supabase.from('match_player_stats').select('points,rebounds,assists').eq('match_id', latestMatch.id)
          .eq('player_id', award.player_id).not('published_at', 'is', null).maybeSingle(),
      ])
      mvpPlayer = player
      mvpStats = stats
    }
  }

  const articleIds = articles.map((article) => article.id)
  const { data: mediaRows } = articleIds.length
    ? await supabase.from('news_media').select('news_id,media_url,media_type,caption')
      .in('news_id', articleIds).order('sort_order')
    : { data: [] as MediaRow[] }
  const mediaByNewsId = new Map<string, MediaRow[]>()
  for (const media of (mediaRows ?? []) as MediaRow[]) {
    mediaByNewsId.set(media.news_id, [...(mediaByNewsId.get(media.news_id) ?? []), media])
  }

  return <>
    <PublicNav />
    <main className="mx-auto max-w-5xl space-y-8 px-4 pb-28 pt-8 sm:px-6">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold-deep)]">Le journal des Lions</p>
        <h1 className="font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Actualités</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">Les nouvelles de l’équipe ESI Basketball et les temps forts de la compétition.</p>
      </header>

      {mvp && mvpPlayer && <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--maroon-900)] text-white" aria-labelledby="mvp-feature-title">
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-64 bg-black/20 md:min-h-80">
            {safeSupabaseAsset(mvpPlayer.photo_url) ? <Image src={safeSupabaseAsset(mvpPlayer.photo_url)!} alt={`${mvpPlayer.first_name} ${mvpPlayer.last_name}`} fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[var(--gold-deep)]/50 to-[var(--maroon-900)]"><span aria-hidden="true" className="font-display text-8xl text-[var(--gold-500)]">MVP</span></div>}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12">
              {mvpStats && [['PTS', mvpStats.points], ['REB', mvpStats.rebounds], ['AST', mvpStats.assists]].map(([label, value]) => <span key={label} className="rounded-lg bg-black/50 px-3 py-2 text-center"><strong className="block font-display text-2xl text-[var(--gold-500)]">{value ?? 0}</strong><span className="text-[10px] font-bold tracking-wide">{label}</span></span>)}
            </div>
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">MVP ESI · match du {formatDate(latestMatch!.scheduled_at)}</p>
            <h2 id="mvp-feature-title" className="mt-3 font-display text-4xl leading-none sm:text-5xl">{mvp.headline || 'La performance du match'}</h2>
            <p className="mt-3 text-lg font-semibold">#{mvpPlayer.jersey_number ?? '—'} {mvpPlayer.first_name} {mvpPlayer.last_name}</p>
            {mvpStats && <p className="mt-2 text-sm text-white/75">{mvpStats.points ?? 0} points · {mvpStats.rebounds ?? 0} rebonds · {mvpStats.assists ?? 0} passes décisives</p>}
            <Link href={`/matchs/${latestMatch!.id}`} className="mt-5 inline-flex min-h-11 w-fit items-center rounded-lg border border-[var(--gold-500)] px-4 py-2 text-sm font-bold text-[var(--gold-500)] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Voir la feuille de match</Link>
          </div>
        </div>
      </section>}

      {articles.length === 0 && !mvp ? <EmptyState title="Pas encore d’actualité" description="Les articles et les temps forts apparaîtront ici dès leur publication par l’équipe." /> : articles.length > 0 ? <section className="grid gap-4 sm:grid-cols-2" aria-label="Articles publiés">
        {articles.map((article) => {
          const cover = safeSupabaseAsset(article.cover_url)
          const media = mediaByNewsId.get(article.id) ?? []
          return <article key={article.id} className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {cover && <div className="relative aspect-[16/9] bg-[var(--paper)]"><Image src={cover} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /></div>}
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-deep)]">{article.category || 'Équipe'}{article.published_at ? ` · ${formatDate(article.published_at)}` : ''}</p>
              <h2 className="mt-2 font-display text-3xl leading-tight text-[var(--maroon-900)]">{article.title}</h2>
              {article.excerpt && <p className="mt-2 text-sm font-medium text-[var(--ink-soft)]">{article.excerpt}</p>}
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--ink)]">{article.body}</p>
              {media.filter((item) => item.media_type === 'video' && safeSupabaseAsset(item.media_url)).map((item) => <video key={item.media_url} className="mt-4 w-full rounded-lg bg-black" controls preload="metadata" src={safeSupabaseAsset(item.media_url)!} aria-label={item.caption || article.title} />)}
            </div>
          </article>
        })}
      </section> : <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5"><h2 className="font-display text-3xl text-[var(--maroon-900)]">À propos</h2><p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">The Lions of ESI représentent l’École Supérieure d’Industrie dans la compétition Inter-Écoles de l’INP-HB. Les actualités de l’équipe seront publiées ici.</p></section>}
    </main>
  </>
}
