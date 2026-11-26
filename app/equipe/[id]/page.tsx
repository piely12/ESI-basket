import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicNav from '@/components/PublicNav'
import PlayerCardVisual from '@/components/PlayerCardVisual'
import PlayerStatsExplorer from '@/components/PlayerStatsExplorer'
import SeasonSelect from '@/components/SeasonSelect'
import { playerCardInfo } from '@/lib/data/player-card'
import { getPlayerProfile } from '@/lib/data/public'
import { nameCase } from '@/lib/format'
import { toLine } from '@/lib/stats/player-stats'

export default async function PlayerPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const result = await getPlayerProfile(id, { seasonId: query.season })
  if (!result) notFound()
  const { player, season, seasons, stats, mvpMatchIds, journeys, radar } = result

  // Un match compte comme joué dès que le joueur a une ligne de stats,
  // même sans minutes saisies sur la feuille de match.
  const entries = stats.map((stat) => ({ matchId: stat.match_id, line: toLine(stat) }))

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-28 pt-5 sm:px-6">
        <Link href="/equipe" className="inline-flex min-h-10 items-center gap-1 rounded text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">‹ Effectif</Link>
        <PlayerCardVisual player={player} />

        <div className="flex justify-start">
          <SeasonSelect seasons={seasons} current={season?.id ?? null} />
        </div>

        <PlayerStatsExplorer
          key={season?.id ?? 'sans-saison'}
          playerName={nameCase(playerCardInfo(player).first_name)}
          entries={entries}
          journeys={journeys}
          mvpMatchIds={mvpMatchIds}
          radar={radar}
        />
      </main>
    </>
  )
}
