import PlayerCardVisual from '@/components/PlayerCardVisual'
import PlayerStatsExplorer from '@/components/PlayerStatsExplorer'
import SeasonSelect from '@/components/SeasonSelect'
import EmptyState from '@/components/ui/EmptyState'
import { requireAnyRole } from '@/lib/auth/requireUser'
import { getPlayerProfile } from '@/lib/data/public'
import { toLine } from '@/lib/stats/player-stats'

export default async function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const [query, { profile }] = await Promise.all([searchParams, requireAnyRole(['joueur'])])
  const result = await getPlayerProfile(profile.person_id, { seasonId: query.season })
  if (!result) return <main className="mx-auto max-w-3xl px-4 py-6"><EmptyState title="Profil joueur introuvable" description="Demande au coach de vérifier le lien entre ton compte et ta fiche joueur." /></main>
  const { player, season, seasons, stats, mvpMatchIds, journeys } = result
  const entries = stats.map((stat) => ({ matchId: stat.match_id, line: toLine(stat) }))
  return <main className="mx-auto max-w-3xl space-y-4 px-4 pt-5 sm:px-6">
    <PlayerCardVisual player={player} />
    <div className="flex justify-start"><SeasonSelect seasons={seasons} current={season?.id ?? null} /></div>
    <PlayerStatsExplorer key={season?.id ?? 'sans-saison'} entries={entries} journeys={journeys} mvpMatchIds={mvpMatchIds} />
  </main>
}
