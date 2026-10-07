import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import { requireAnyRole } from '@/lib/auth/requireUser'

type MatchRow = {
  id: string
  scheduled_at: string
  location: string | null
  status: string
  home_score: number | null
  away_score: number | null
  home_team_id: string
  away_team_id: string
  home_team: { name: string } | null
  away_team: { name: string } | null
}

type RosterRow = {
  match_id: string
  is_called_up: boolean
  response: string | null
  validated_at: string | null
}

type StatRow = {
  match_id: string
  minutes_played: number | string | null
  points: number | null
  rebounds: number | null
  assists: number | null
  steals: number | null
  blocks: number | null
  turnovers: number | null
  fg_made: number | null
  fg_attempted: number | null
  three_made: number | null
  three_attempted: number | null
  ft_made: number | null
  ft_attempted: number | null
  published_at: string | null
}

type NotificationRow = {
  id: string
  title: string
  body: string
  href: string | null
  read_at: string | null
  created_at: string
}

const dateTime = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  timeZone: 'Africa/Abidjan',
}).format(new Date(value))

const dateOnly = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Abidjan',
}).format(new Date(value))

const numberValue = (value: number | string | null) => Number(value ?? 0)

function MatchTitle({ match, teamId }: { match: MatchRow; teamId: string }) {
  const homeName = match.home_team?.name ?? 'Équipe domicile'
  const awayName = match.away_team?.name ?? 'Équipe visiteuse'
  const hasScore = match.status === 'termine' && match.home_score !== null && match.away_score !== null
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
      <span className={`min-w-0 flex-1 truncate text-right ${match.home_team_id === teamId ? 'font-bold text-[var(--maroon-900)]' : 'text-[var(--ink-soft)]'}`}>{homeName}</span>
      <span className="shrink-0 rounded-md bg-[var(--paper)] px-2 py-1 font-display text-lg text-[var(--maroon-900)]">
        {hasScore ? `${match.home_score} – ${match.away_score}` : 'VS'}
      </span>
      <span className={`min-w-0 flex-1 truncate ${match.away_team_id === teamId ? 'font-bold text-[var(--maroon-900)]' : 'text-[var(--ink-soft)]'}`}>{awayName}</span>
    </div>
  )
}

export default async function Page() {
  const { supabase, user, profile } = await requireAnyRole(['joueur', 'admin'])

  if (profile.role !== 'joueur') {
    return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header className="rounded-2xl bg-[var(--maroon-900)] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">Espace joueur</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Suivi individuel</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80">Cet espace affiche les informations associées au compte joueur connecté.</p>
      </header>
      <EmptyState title="Aucun profil joueur lié" description="Ce compte administrateur n’est pas rattaché à une fiche joueur. Les données individuelles restent réservées au compte de chaque joueur." actionLabel="Ouvrir l’administration" href="/admin" />
    </main>
  }

  const playerId = profile.person_id
  const [playerResult, rosterResult, notificationResult] = await Promise.all([
    supabase.from('players').select('id,team_id,first_name,last_name,jersey_number,position,status,photo_url')
      .eq('id', playerId).eq('user_id', user.id).maybeSingle(),
    supabase.from('match_rosters').select('match_id,is_called_up,response,validated_at')
      .eq('player_id', playerId).eq('is_called_up', true),
    supabase.from('notifications').select('id,title,body,href,read_at,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ])

  if (playerResult.error || rosterResult.error || notificationResult.error) {
    return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink)]">Impossible de charger ton espace. Actualise la page puis réessaie.</p>
    </main>
  }

  const player = playerResult.data
  if (!player) {
    return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <EmptyState title="Profil joueur introuvable" description="Demande au coach de vérifier le lien entre ton compte et ta fiche joueur." actionLabel="Contacter le staff" href="/reglages" />
    </main>
  }

  const roster = (rosterResult.data ?? []) as RosterRow[]
  const matchIds = [...new Set(roster.map((row) => row.match_id))]
  const [matchesResult, statsResult] = await Promise.all([
    matchIds.length
      ? supabase.from('matches').select('id,scheduled_at,location,status,home_score,away_score,home_team_id,away_team_id,home_team:teams!matches_home_team_id_fkey(name),away_team:teams!matches_away_team_id_fkey(name)')
        .in('id', matchIds).order('scheduled_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? supabase.from('match_player_stats').select('match_id,minutes_played,points,rebounds,assists,steals,blocks,turnovers,fg_made,fg_attempted,three_made,three_attempted,ft_made,ft_attempted,published_at')
        .eq('player_id', player.id).not('published_at', 'is', null).order('published_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (matchesResult.error || statsResult.error) {
    return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink)]">Impossible de charger tes matchs et statistiques. Actualise la page puis réessaie.</p>
    </main>
  }

  const matches = (matchesResult.data ?? []) as unknown as MatchRow[]
  const matchById = new Map(matches.map((match) => [match.id, match]))
  const convocations = roster.map((row) => ({ ...row, match: matchById.get(row.match_id) }))
    .filter((row) => row.match)
  const upcoming = convocations.filter(({ match }) => match && match.status !== 'termine')
    .sort((a, b) => a.match!.scheduled_at.localeCompare(b.match!.scheduled_at))
  const history = convocations.filter(({ match }) => match?.status === 'termine')
    .sort((a, b) => b.match!.scheduled_at.localeCompare(a.match!.scheduled_at))
  const stats = (statsResult.data ?? []) as StatRow[]
  const totals = stats.reduce((sum, row) => ({
    points: sum.points + numberValue(row.points), rebounds: sum.rebounds + numberValue(row.rebounds),
    assists: sum.assists + numberValue(row.assists), games: sum.games + 1,
  }), { points: 0, rebounds: 0, assists: 0, games: 0 })
  const notifications = (notificationResult.data ?? []) as NotificationRow[]
  const statusLabel = player.status === 'actif' ? 'Disponible' : player.status === 'blesse' ? 'Indisponible' : 'Suspendu'

  return <main className="mx-auto max-w-5xl space-y-6 px-4 pb-24 pt-8 sm:px-6">
    <header className="overflow-hidden rounded-2xl bg-[var(--maroon-900)] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">Espace joueur · suivi personnel</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-none sm:text-5xl">Bonjour {player.first_name}</h1>
          <p className="mt-3 text-sm text-white/80">#{player.jersey_number ?? '—'} · {player.position ?? 'Poste à définir'} · {statusLabel}</p>
        </div>
        <Link href="/equipe" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--gold-500)] px-4 py-2 text-sm font-bold text-[var(--gold-500)] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Voir l’équipe</Link>
      </div>
    </header>

    <section aria-label="Résumé de la saison" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        ['Matchs publiés', totals.games], ['Points', totals.points], ['Rebonds', totals.rebounds], ['Passes', totals.assists],
      ].map(([label, value]) => <article key={label} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="text-xs font-semibold text-[var(--ink-soft)]">{label}</p>
        <p className="mt-1 font-display text-3xl text-[var(--maroon-900)]">{value}</p>
      </article>)}
    </section>

    <section className="space-y-3" aria-labelledby="upcoming-title">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-deep)]">Prochaines échéances</p><h2 id="upcoming-title" className="font-display text-3xl text-[var(--maroon-900)]">Convocations</h2></div><Link href="/matchs" className="text-sm font-semibold text-[var(--maroon-900)] underline underline-offset-4">Calendrier</Link></div>
      {upcoming.length === 0 ? <EmptyState title="Pas de convocation à venir" description="Les convocations validées par le coach apparaîtront ici." actionLabel="Voir le calendrier" href="/matchs" /> : <div className="grid gap-3">
        {upcoming.map(({ match, response }) => match && <article key={match.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><time className="text-xs font-semibold capitalize text-[var(--ink-soft)]" dateTime={match.scheduled_at}>{dateTime(match.scheduled_at)}</time><span className="rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-bold text-[var(--maroon-900)]">{response === 'present' ? 'Présence confirmée' : response === 'absent' ? 'Absence enregistrée' : 'Convoqué'}</span></div>
          <div className="mt-3"><MatchTitle match={match} teamId={player.team_id} /></div>
          <p className="mt-2 text-xs text-[var(--ink-soft)]">{match.location ?? 'Lieu à confirmer'}</p>
          <Link href={`/matchs/${match.id}`} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--maroon-900)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-deep)]">Détails du match</Link>
        </article>)}
      </div>}
    </section>

    <section className="space-y-3" aria-labelledby="history-title">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-deep)]">Performances vérifiées</p><h2 id="history-title" className="font-display text-3xl text-[var(--maroon-900)]">Historique et statistiques</h2></div>
      {history.length === 0 ? <EmptyState title="Aucun match terminé" description="Ton historique et tes statistiques publiées apparaîtront après validation des feuilles de match." /> : <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        {history.map(({ match }) => {
          if (!match) return null
          const row = stats.find((stat) => stat.match_id === match.id)
          return <article key={match.id} className="border-b border-[var(--line)] p-4 last:border-b-0 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><time className="text-xs capitalize text-[var(--ink-soft)]" dateTime={match.scheduled_at}>{dateOnly(match.scheduled_at)}</time><span className="text-xs font-semibold text-[var(--ink-soft)]">{match.location ?? 'Match terminé'}</span></div>
            <div className="mt-3"><MatchTitle match={match} teamId={player.team_id} /></div>
            {row ? <dl className="mt-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
              {[
                ['MIN', numberValue(row.minutes_played)], ['PTS', numberValue(row.points)], ['REB', numberValue(row.rebounds)],
                ['AST', numberValue(row.assists)], ['STL', numberValue(row.steals)], ['BLK', numberValue(row.blocks)],
              ].map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--paper)] px-2 py-2"><dt className="text-[10px] font-bold tracking-wide text-[var(--ink-soft)]">{label}</dt><dd className="font-display text-xl text-[var(--maroon-900)]">{value}</dd></div>)}
            </dl> : <p className="mt-3 text-sm text-[var(--ink-soft)]">La feuille de statistiques n’est pas encore publiée.</p>}
            <Link href={`/matchs/${match.id}`} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--maroon-900)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-deep)]">Voir la feuille publique</Link>
          </article>
        })}
      </div>}
    </section>

    <section className="space-y-3" aria-labelledby="notifications-title">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-deep)]">Infos équipe</p><h2 id="notifications-title" className="font-display text-3xl text-[var(--maroon-900)]">Notifications</h2></div>
      {notifications.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Tu es à jour. Les notifications du staff apparaîtront ici.</div> : <ul className="space-y-2">
        {notifications.map((notification) => <li key={notification.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-[var(--ink)]">{notification.title}</h3><time className="shrink-0 text-xs text-[var(--ink-soft)]" dateTime={notification.created_at}>{dateOnly(notification.created_at)}</time></div>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{notification.body}</p>
          {notification.href?.startsWith('/') && !notification.href.startsWith('//') && <Link href={notification.href} className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-[var(--maroon-900)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-deep)]">Ouvrir</Link>}
          {!notification.read_at && <span className="ml-3 inline-flex rounded-full bg-[var(--gold-500)]/20 px-2 py-1 text-[10px] font-bold uppercase text-[var(--maroon-900)]">Nouveau</span>}
        </li>)}
      </ul>}
    </section>
  </main>
}
