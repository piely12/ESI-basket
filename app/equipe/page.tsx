import PublicNav from '@/components/PublicNav'
import RosterGrid from './RosterGrid'
import { getRoster } from '@/lib/data/public'
import PageTitle from '@/components/PageTitle'
import StaffGrid from './StaffGrid'

const staff = [
  { name: 'SAIH PIELY', role: 'Coach principal', photo: '/staff/saih-piely.webp', photoLarge: '/staff/saih-piely-grand.webp' },
  { name: 'N’GUESSAN DANIEL-ANGE', role: 'Coach adjoint', photo: '/staff/nguessan-daniel-ange.webp', photoLarge: '/staff/nguessan-daniel-ange-grand.webp' },
  { name: 'MELEDJE ELMIRA', role: 'Statisticienne', photo: '/staff/meledje-elmira.webp?v=2', photoLarge: '/staff/meledje-elmira-grand.webp?v=2' },
  { name: 'KPANGBE NOURA', role: 'Vidéaste', photo: '/staff/kpangbe-noura.webp', photoLarge: '/staff/kpangbe-noura-grand.webp' },
  { name: 'MEITE ANNE-SAPHIRA', role: 'Infographe', photo: '/staff/meite-anne-saphira.webp', photoLarge: '/staff/meite-anne-saphira-grand.webp' },
]

export default async function EquipePage() {
  const roster = await getRoster()

  return (
    <>
      <PublicNav />
      <main className="reference-page-shell page-title-page mx-auto max-w-screen-2xl px-4 pb-28 pt-8 sm:px-6 lg:px-10 2xl:px-12">
        <PageTitle title="Les Lions de l’ESI" subtitle={`${roster.length} joueur${roster.length === 1 ? '' : 's'}`} />
        <RosterGrid players={roster} />
        <section aria-labelledby="staff-title" className="mt-10 border-t border-border pt-6">
          <h2 id="staff-title" className="mb-4 font-display text-3xl uppercase text-brand">Le staff</h2>
          <StaffGrid staff={staff} />
        </section>
      </main>
    </>
  )
}
