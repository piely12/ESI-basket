import PublicNav from '@/components/PublicNav'
import RosterGrid from './RosterGrid'
import { getRoster } from '@/lib/data/public'

export default async function EquipePage() {
  const roster = await getRoster()

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-5">
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold-deep)]">Effectif officiel</p>
          <h1 className="font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Les Lions de l’ESI</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{roster.length} joueur{roster.length === 1 ? '' : 's'} · Saison en cours</p>
        </header>
        <RosterGrid players={roster} />
      </main>
    </>
  )
}
