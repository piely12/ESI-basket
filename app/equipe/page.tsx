import PublicNav from '@/components/PublicNav'
import RosterGrid from './RosterGrid'
import { getRoster } from '@/lib/data/public'
import PageTitle from '@/components/PageTitle'

export default async function EquipePage() {
  const roster = await getRoster()

  return (
    <>
      <PublicNav />
      <main className="reference-page-shell page-title-page mx-auto max-w-screen-2xl px-4 pb-28 pt-8 sm:px-6 lg:px-10 2xl:px-12">
        <PageTitle title="Les Lions de l’ESI" subtitle={`${roster.length} joueur${roster.length === 1 ? '' : 's'}`} />
        <RosterGrid players={roster} />
      </main>
    </>
  )
}
