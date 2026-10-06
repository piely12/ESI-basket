import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import TeamLogo from '@/components/TeamLogo'
import type { Team } from '@/lib/data/public'
import { saveComposition, saveConvocations } from '../../actions'

const COACH_ROLES = ['coach', 'coach_adjoint', 'admin']

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}

export default async function CoachMatchPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')
  const profile = await getCurrentUserProfile(supabase)
  if (!profile || !COACH_ROLES.includes(profile.role)) redirect('/acces-refuse')

  const { data: match, error: matchError } = await supabase.from('matches')
    .select(`id, scheduled_at, location, status, home_team_id, away_team_id,
      home_team:teams!matches_home_team_id_fkey(id,name,city,logo_url,is_esi),
      away_team:teams!matches_away_team_id_fkey(id,name,city,logo_url,is_esi)`)
    .eq('id', id)
    .maybeSingle()
  if (matchError || !match) notFound()

  if (profile.role !== 'admin' && (!profile.team_id || ![match.home_team_id, match.away_team_id].includes(profile.team_id))) {
    redirect('/acces-refuse')
  }

  const teamIds = profile.role === 'admin'
    ? [match.home_team_id, match.away_team_id]
    : [profile.team_id as string]

  const [playersResult, rosterResult, convocationResult, lineupResult] = await Promise.all([
    supabase.from('players')
      .select('id,first_name,last_name,jersey_number,position,status,photo_url,team_id')
      .in('team_id', teamIds)
      .order('jersey_number', { ascending: true }),
    supabase.from('match_rosters').select('id,player_id').eq('match_id', id),
    supabase.from('convocations').select('id,player_id').eq('match_id', id),
    supabase.from('match_lineups').select('player_id,is_starter').eq('match_id', id),
  ])

  const hasError = playersResult.error || rosterResult.error || convocationResult.error || lineupResult.error
  const players = playersResult.data ?? []
  const rosterIds = new Set((rosterResult.data ?? []).map((row) => row.player_id))
  const convokedIds = new Set((convocationResult.data ?? []).map((row) => row.player_id))
  const lineupByPlayer = new Map((lineupResult.data ?? []).map((row) => [row.player_id, row.is_starter]))
  const convokedPlayers = players.filter((player) => rosterIds.has(player.id))
  const homeTeam = match.home_team as unknown as Team
  const awayTeam = match.away_team as unknown as Team
  const savedMessage = query.saved === 'convocations'
    ? 'Les convocations ont été enregistrées.'
    : query.saved === 'composition' ? 'La composition a été enregistrée.' : null

  return (
    <main className="mx-auto max-w-5xl space-y-7 px-4 pb-28 pt-6 sm:px-6">
      <Link href="/coach" className="text-sm font-semibold text-[var(--maroon-700)] hover:underline">← Retour à l’espace Coach</Link>

      <header className="rounded-3xl bg-[var(--maroon-900)] p-5 text-white sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Gestion du match</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <TeamLogo team={homeTeam} size={48} />
            <span className="font-bold sm:text-lg">{homeTeam.name}</span>
          </div>
          <span className="font-display text-2xl text-[var(--gold)]">VS</span>
          <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row-reverse sm:text-right">
            <TeamLogo team={awayTeam} size={48} />
            <span className="font-bold sm:text-lg">{awayTeam.name}</span>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-white/75">
          {new Date(match.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Abidjan' })}
          {match.location ? ` · ${match.location}` : ''}
        </p>
      </header>

      {savedMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{savedMessage}</p>}
      {hasError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">Certaines données du match n’ont pas pu être chargées. Vérifie les droits RLS et la migration <code>006_current_user_profile.sql</code>.</p>}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Avant le match</p>
            <h1 className="font-display text-3xl text-[var(--maroon-900)]">Convocations</h1>
          </div>
          <span className="text-sm text-[var(--ink-soft)]">{convokedIds.size} joueur{convokedIds.size === 1 ? '' : 's'} convoqué{convokedIds.size === 1 ? '' : 's'}</span>
        </div>

        {players.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">Aucun joueur disponible dans l’effectif associé à cette équipe.</p>
        ) : (
          <form action={saveConvocations}>
            <input type="hidden" name="match_id" value={id} />
            <div className="grid gap-2 sm:grid-cols-2">
              {players.map((player) => (
                <label key={player.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] p-3 hover:bg-[#faf5ef]">
                  <input type="checkbox" name="player_ids" value={player.id} defaultChecked={convokedIds.has(player.id) || rosterIds.has(player.id)} className="size-4 accent-[#741126]" />
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--maroon-900)] font-display text-xl text-[var(--gold)]">{player.jersey_number ?? '—'}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[var(--maroon-900)]">{player.first_name} {player.last_name}</span>
                    <span className="block text-xs text-[var(--ink-soft)]">{player.position || 'Poste à préciser'} · {player.status}</span>
                  </span>
                </label>
              ))}
            </div>
            <button className="mt-5 rounded-full bg-[var(--maroon-900)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--maroon-700)]">Enregistrer les convocations</button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-deep)]">Cinq de départ</p>
            <h2 className="font-display text-3xl text-[var(--maroon-900)]">Composition</h2>
          </div>
          <span className="text-sm text-[var(--ink-soft)]">{[...lineupByPlayer.values()].filter(Boolean).length} titulaire{[...lineupByPlayer.values()].filter(Boolean).length === 1 ? '' : 's'}</span>
        </div>

        {convokedPlayers.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">Enregistre d’abord les convocations pour préparer la composition.</p>
        ) : (
          <form action={saveComposition}>
            <input type="hidden" name="match_id" value={id} />
            <div className="grid gap-2 sm:grid-cols-2">
              {convokedPlayers.map((player) => (
                <label key={player.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] p-3 hover:bg-[#faf5ef]">
                  <input type="checkbox" name="starter_ids" value={player.id} defaultChecked={lineupByPlayer.get(player.id) === true} className="size-4 accent-[#741126]" />
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--maroon-900)] font-display text-xl text-[var(--gold)]">{player.jersey_number ?? '—'}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[var(--maroon-900)]">{player.first_name} {player.last_name}</span>
                    <span className="block text-xs text-[var(--ink-soft)]">{player.position || 'Poste à préciser'}</span>
                  </span>
                  {lineupByPlayer.get(player.id) === false && <span className="ml-auto text-xs text-[var(--ink-soft)]">Remplaçant</span>}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--ink-soft)]">Coche jusqu’à cinq titulaires. Les autres joueurs convoqués seront enregistrés comme remplaçants.</p>
            <button className="mt-5 rounded-full bg-[var(--maroon-900)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--maroon-700)]">Enregistrer la composition</button>
          </form>
        )}
      </section>
    </main>
  )
}
