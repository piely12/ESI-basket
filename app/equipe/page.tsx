import PublicNav from '@/components/PublicNav'
import RosterGrid from './RosterGrid'
import { getRoster } from '@/lib/data/public'

export default async function EquipePage() {
  const roster = await getRoster()

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-screen-2xl px-4 pb-28 pt-8 sm:px-6 lg:px-10 2xl:px-12">
        <header className="mb-5">
          <h1 className="font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Les Lions de l’ESI</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{roster.length} joueur{roster.length === 1 ? '' : 's'}</p>
        </header>
        <RosterGrid players={roster} />
      </main>
    </>
  )
}
