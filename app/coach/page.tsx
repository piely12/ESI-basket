import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import TeamLogo from '@/components/TeamLogo'
import type { Team } from '@/lib/data/public'

type CoachMatch = {
  id: string
  scheduled_at: string
  location: string | null
  status: string
  home_team: Team
  away_team: Team
}

const COACH_ROLES = ['coach', 'coach_adjoint', 'admin']

export default async function CoachHomePage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const profile = await getCurrentUserProfile(supabase)
  if (!profile || !COACH_ROLES.includes(profile.role)) redirect('/acces-refuse')
  if (profile.role !== 'admin' && !profile.team_id) redirect('/acces-refuse')

  let matchesQuery = supabase
    .from('matches')
    .select(`id, scheduled_at, location, status,
      home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),
      away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)`)
    .in('status', ['programme', 'a_venir', 'jour_j', 'en_cours'])

  if (profile.role !== 'admin') {
    matchesQuery = matchesQuery.or(`home_team_id.eq.${profile.team_id},away_team_id.eq.${profile.team_id}`)
  }

  const [matchesResult, rosterResult] = await Promise.all([
    matchesQuery.order('scheduled_at', { ascending: true }).limit(6),
    profile.team_id
      ? supabase.from('players')
          .select('id,first_name,last_name,jersey_number,position,status,photo_url')
          .eq('team_id', profile.team_id)
          .order('jersey_number', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  const matches = (matchesResult.data ?? []) as unknown as CoachMatch[]
  const roster = rosterResult.data ?? []
  const queryError = matchesResult.error || rosterResult.error

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 pb-28 pt-8 sm:px-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold-deep)]">Pilotage de l’équipe</p>
        <h1 className="mt-1 font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Espace Coach</h1>
        <p className="mt-3 text-[var(--ink-soft)]">Bonjour {profile.first_name}, voici les prochains matchs et l’effectif.</p>
      </header>

      {queryError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Impossible de charger les données de l’équipe. Vérifie que la migration <code>006_current_user_profile.sql</code> est appliquée et que les droits RLS sont actifs.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <p className="text-sm text-[var(--ink-soft)]">Prochains matchs</p>
          <p className="mt-2 font-display text-4xl text-[var(--maroon-900)]">{matches.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <p className="text-sm text-[var(--ink-soft)]">Joueurs dans l’effectif</p>
          <p className="mt-2 font-display text-4xl text-[var(--maroon-900)]">{roster.length}</p>
        </div>
        <div className="rounded-2xl bg-[var(--maroon-900)] p-5 text-white">
          <p className="text-sm text-white/75">Actions rapides</p>
          <Link href="#effectif" className="mt-3 inline-flex rounded-full border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10">
            Voir l’effectif
          </Link>
        </div>
      </section>

      <section aria-labelledby="matches-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Calendrier</p>
            <h2 id="matches-title" className="font-display text-3xl text-[var(--maroon-900)]">Prochains matchs</h2>
          </div>
        </div>
        {matches.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-6 text-sm text-[var(--ink-soft)]">Aucun match à venir pour le moment.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {matches.map((match) => (
              <article key={match.id} className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 text-xs text-[var(--ink-soft)]">
                  <time dateTime={match.scheduled_at}>{new Date(match.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Abidjan' })}</time>
                  <span>{match.location || 'Lieu à confirmer'}</span>
                </div>
                <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo team={match.home_team} size={36} />
                    <span className="truncate text-sm font-semibold text-[var(--maroon-900)]">{match.home_team.name}</span>
                  </div>
                  <span className="font-display text-xl text-[var(--gold-deep)]">VS</span>
                  <div className="flex min-w-0 items-center justify-end gap-2">
                    <span className="truncate text-right text-sm font-semibold text-[var(--maroon-900)]">{match.away_team.name}</span>
                    <TeamLogo team={match.away_team} size={36} />
                  </div>
                </div>
                <Link href={`/coach/matchs/${match.id}`} className="inline-flex rounded-full bg-[var(--maroon-900)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--maroon-700)]">
                  Gérer convocations et composition
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="effectif" aria-labelledby="roster-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Groupe</p>
            <h2 id="roster-title" className="font-display text-3xl text-[var(--maroon-900)]">Effectif</h2>
          </div>
          <span className="text-sm text-[var(--ink-soft)]">{roster.length} joueur{roster.length === 1 ? '' : 's'}</span>
        </div>
        {roster.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-6 text-sm text-[var(--ink-soft)]">Aucun joueur associé à cette équipe.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map((player) => (
              <li key={player.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--maroon-900)] font-display text-2xl text-[var(--gold)]">{player.jersey_number ?? '—'}</span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-[var(--maroon-900)]">{player.first_name} {player.last_name}</p>
                  <p className="text-sm text-[var(--ink-soft)]">{player.position || 'Poste à préciser'} · {player.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
