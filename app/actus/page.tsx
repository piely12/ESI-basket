import Link from 'next/link'
import { requireAnyRole } from '@/lib/auth/requireUser'
import NewsCreateForm from './NewsCreateForm'
import NewsEditForm from './NewsEditForm'
import MvpEditorForm from './MvpEditorForm'
import { clearMvpAward, setNewsPublished } from './actions'

type Article = {
  id: string
  title: string
  excerpt: string | null
  body: string
  category: string | null
  cover_url: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

type Player = { id: string; first_name: string; last_name: string; jersey_number: number | null }

const formatDate = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Abidjan',
}).format(new Date(value))

export default async function Page() {
  const { supabase, profile } = await requireAnyRole(['videaste', 'admin'])
  let teamId = profile.team_id
  if (!teamId) {
    const { data: esi } = await supabase.from('teams').select('id').eq('is_esi', true).maybeSingle()
    teamId = esi?.id ?? null
  }
  if (!teamId) return <main className="mx-auto max-w-5xl px-4 py-8"><p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">L’équipe ESI est introuvable. Vérifie sa fiche avant de gérer les actualités.</p></main>

  const [articlesResult, teamResult, latestMatchResult] = await Promise.all([
    supabase.from('news').select('id,title,excerpt,body,category,cover_url,is_published,published_at,created_at')
      .order('created_at', { ascending: false }).limit(30),
    supabase.from('teams').select('is_esi').eq('id', teamId).maybeSingle(),
    supabase.from('matches').select('id,scheduled_at,home_team_id,away_team_id')
      .eq('status', 'termine').or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order('scheduled_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (articlesResult.error || teamResult.error || latestMatchResult.error || !teamResult.data?.is_esi) {
    return <main className="mx-auto max-w-5xl px-4 py-8"><p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">Impossible de charger l’espace éditorial. Actualise la page puis réessaie.</p></main>
  }

  const articles = (articlesResult.data ?? []) as Article[]
  const latestMatch = latestMatchResult.data
  let mvp: { id: string; player_id: string; headline: string | null; published_at: string | null } | null = null
  let mvpPlayer: Player | null = null
  let eligiblePlayers: Player[] = []

  if (latestMatch) {
    const [{ data: award }, { data: publishedStats }] = await Promise.all([
      supabase.from('mvp_awards').select('id,player_id,headline,published_at').eq('match_id', latestMatch.id).maybeSingle(),
      supabase.from('match_player_stats').select('player_id').eq('match_id', latestMatch.id).not('published_at', 'is', null),
    ])
    mvp = award
    const statPlayerIds = [...new Set((publishedStats ?? []).map((row) => row.player_id))]
    const [{ data: eligible }, { data: currentPlayer }] = await Promise.all([
      statPlayerIds.length
        ? supabase.from('players').select('id,first_name,last_name,jersey_number').eq('team_id', teamId).in('id', statPlayerIds).order('jersey_number')
        : Promise.resolve({ data: [], error: null }),
      award
        ? supabase.from('players').select('id,first_name,last_name,jersey_number').eq('id', award.player_id).eq('team_id', teamId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    eligiblePlayers = (eligible ?? []) as Player[]
    mvpPlayer = currentPlayer as Player | null
  }

  return <main className="mx-auto max-w-5xl space-y-7 px-4 pb-24 pt-8 sm:px-6">
    <header className="overflow-hidden rounded-2xl bg-[var(--maroon-900)] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-500)]">Le journal des Lions</p>
      <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">Actualités</h1>
      <p className="mt-3 max-w-2xl text-sm text-white/80">Prépare un article, ajoute un média et publie quand tout est prêt.</p>
    </header>

    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="create-news-title">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-deep)]">Publication guidée</p><h2 id="create-news-title" className="font-display text-3xl text-[var(--maroon-900)]">Nouvelle actualité</h2></div>
      <NewsCreateForm />
    </section>

    <section className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="mvp-title">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-deep)]">À la une · dernier match ESI terminé</p><h2 id="mvp-title" className="font-display text-3xl text-[var(--maroon-900)]">MVP du match</h2></div>
      {!latestMatch ? <p className="rounded-lg bg-[var(--paper)] p-4 text-sm text-[var(--ink-soft)]">Aucun match ESI terminé pour le moment. Le bloc MVP reste masqué sur le site public.</p> : <>
        <div className="rounded-lg bg-[var(--paper)] p-4 text-sm text-[var(--ink-soft)]"><p>Match du {formatDate(latestMatch.scheduled_at)}.</p>
          {mvp && mvpPlayer ? <p className="mt-1 font-semibold text-[var(--maroon-900)]">MVP actuel : #{mvpPlayer.jersey_number ?? '—'} {mvpPlayer.first_name} {mvpPlayer.last_name}{mvp.headline ? ` · « ${mvp.headline} »` : ''}</p> : <p className="mt-1">Aucun MVP n’est publié. La une ne laissera pas de bloc vide.</p>}
        </div>
        <MvpEditorForm matchId={latestMatch.id} players={eligiblePlayers} currentHeadline={mvp?.headline ?? null} />
        {mvp && <form action={clearMvpAward.bind(null, latestMatch.id)}>
          <button className="min-h-10 rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink-soft)] hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-deep)]">Retirer le MVP de la une</button>
        </form>}
      </>}
    </section>

    <section className="space-y-4" aria-labelledby="articles-title">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-deep)]">Brouillons et publications</p><h2 id="articles-title" className="font-display text-3xl text-[var(--maroon-900)]">Tes articles</h2></div><Link href="/actualites" className="text-sm font-semibold text-[var(--maroon-900)] underline underline-offset-4">Voir le site public</Link></div>
      {articles.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-soft)]">Aucun article pour l’instant. Enregistre un brouillon avec le formulaire ci-dessus.</div> : <div className="grid gap-3">
        {articles.map((article) => <article key={article.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl text-[var(--maroon-900)]">{article.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${article.is_published ? 'bg-emerald-100 text-emerald-900' : 'bg-[var(--paper)] text-[var(--ink-soft)]'}`}>{article.is_published ? 'Publié' : 'Brouillon'}</span></div>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">{article.category ?? 'Actualité'} · {article.published_at ? `Publié le ${formatDate(article.published_at)}` : `Créé le ${formatDate(article.created_at)}`}</p>
              {article.excerpt && <p className="mt-2 max-w-3xl text-sm text-[var(--ink-soft)]">{article.excerpt}</p>}
              {article.cover_url && <a href={article.cover_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-[var(--maroon-900)] underline underline-offset-4">Ouvrir le média</a>}
              <NewsEditForm article={article} />
            </div>
            <form action={setNewsPublished.bind(null, article.id, !article.is_published)}>
              <button className="min-h-11 rounded-lg bg-[var(--maroon-900)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">{article.is_published ? 'Dépublier' : 'Publier'}</button>
            </form>
          </div>
        </article>)}
      </div>}
    </section>
  </main>
}
