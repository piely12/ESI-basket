import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireUser'

type MatchRow = {
  id: string
  scheduled_at: string
  status: string
  location: string | null
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  home_team: { name: string } | null
  away_team: { name: string } | null
}

const workflowLabel: Record<string, string> = {
  brouillon: 'À saisir', saisie_en_cours: 'Saisie en cours', pret_a_verifier: 'À vérifier',
  a_corriger: 'Correction à terminer', pret_a_publier: 'Prêt à publier', publie: 'Publié',
}

export default async function StatsPage() {
  const { supabase, profile } = await requireRole('statisticienne')
  if (!profile.team_id) return <main className="mx-auto max-w-5xl px-4 py-8"><p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">Le compte statisticienne n’est associé à aucune équipe. Contacte l’administrateur.</p></main>
  const { data: team, error: teamError } = await supabase.from('teams').select('is_esi').eq('id', profile.team_id).maybeSingle()
  if (teamError || !team?.is_esi) return <main className="mx-auto max-w-5xl px-4 py-8"><p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">Cette page est réservée à la statisticienne de l’équipe ESI.</p></main>

  const select = 'id,scheduled_at,status,location,home_team_id,away_team_id,home_score,away_score,home_team:teams!matches_home_team_id_fkey(name),away_team:teams!matches_away_team_id_fkey(name)'
  const [home, away] = await Promise.all([
    supabase.from('matches').select(select).eq('home_team_id', profile.team_id).eq('status', 'termine').order('scheduled_at', { ascending: false }).limit(40),
    supabase.from('matches').select(select).eq('away_team_id', profile.team_id).eq('status', 'termine').order('scheduled_at', { ascending: false }).limit(40),
  ])
  const failed = !!home.error || !!away.error
  const matches = [...new Map([...home.data ?? [], ...away.data ?? []].map((match) => [match.id, match])).values()]
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)) as unknown as MatchRow[]
  const ids = matches.map((match) => match.id)
  const { data: workflows, error: workflowError } = ids.length
    ? await supabase.from('match_stats_workflow').select('match_id,status').in('match_id', ids)
    : { data: [], error: null }
  const workflowByMatch = new Map((workflows ?? []).map((row) => [row.match_id, row.status]))

  return <main className="mx-auto max-w-5xl space-y-6 px-4 pb-20 pt-8 sm:px-5">
    <header className="rounded-2xl bg-maroon-panel p-6 text-on-brand sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">Espace statisticienne</p>
      <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">Feuilles de match</h1>
      <p className="mt-3 max-w-2xl text-sm text-on-brand/80">Saisis les résultats après le match. La sauvegarde est automatique; la publication attend ta relecture.</p>
    </header>
    {failed || workflowError ? <section role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Impossible de charger les matchs terminés. Actualise la page puis réessaie.</section>
      : matches.length === 0 ? <section className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center"><h2 className="font-display text-2xl text-brand">Aucun match terminé</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">Les rencontres terminées apparaîtront ici pour la saisie des statistiques.</p></section>
        : <section className="space-y-3" aria-label="Rencontres terminées de l’équipe">
          {matches.map((match) => {
            const status = workflowByMatch.get(match.id) ?? 'brouillon'
            return <article key={match.id} className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">{new Date(match.scheduled_at).toLocaleDateString('fr-FR', { dateStyle: 'full', timeZone: 'Africa/Abidjan' })}</p><h2 className="mt-1 font-display text-2xl text-brand">{match.home_team?.name ?? 'Équipe'} <span className="text-[var(--gold-deep)]">{match.home_score ?? '–'} : {match.away_score ?? '–'}</span> {match.away_team?.name ?? 'Équipe'}</h2>{match.location && <p className="text-sm text-[var(--ink-soft)]">{match.location}</p>}</div>
              <div className="flex shrink-0 flex-wrap items-center gap-3"><span className="rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-bold text-brand">{workflowLabel[status] ?? 'À saisir'}</span><Link href={`/stats/${match.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-maroon-panel px-4 py-2 text-sm font-semibold text-on-brand hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">{status === 'publie' ? 'Consulter' : 'Ouvrir la feuille'}</Link></div>
            </article>
          })}
        </section>}
  </main>
}
