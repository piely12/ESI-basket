import PublicNav from '@/components/PublicNav'
import StandingsView from './StandingsView'
import { getStandings } from '@/lib/data/public'
import PageTitle from '@/components/PageTitle'

export default async function ClassementPage() {
  const standings = await getStandings()

  return (
    <>
      <PublicNav />
      <main className="reference-page-shell page-title-page mx-auto max-w-screen-xl px-4 pb-28 pt-8 sm:px-6 lg:px-10">
        <PageTitle title="Classement" />
        <StandingsView rows={standings} />
      </main>
    </>
  )
}
