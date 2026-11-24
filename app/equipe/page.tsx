import PublicNav from '@/components/PublicNav'
import RosterGrid from './RosterGrid'
import { getRoster } from '@/lib/data/public'
import PageTitle from '@/components/PageTitle'

const staff = [
  { name: 'SAIH PIELY', role: 'Coach principal', photo: '/staff/saih-piely.webp' },
  { name: 'N’GUESSAN DANIEL-ANGE', role: 'Coach adjoint', photo: '/staff/nguessan-daniel-ange.webp' },
  { name: 'MELEDJE ELMIRA', role: 'Statisticienne', photo: '/staff/meledje-elmira.webp' },
  { name: 'KPANGBE NOURA', role: 'Vidéaste', photo: '/staff/kpangbe-noura.webp' },
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
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {staff.map((person) => <li key={person.role} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- photo déjà recadrée et compressée (400×400 WebP) */}
              <img src={person.photo} alt={`Photo de ${person.name}, ${person.role.toLowerCase()}`} width={400} height={400} loading="lazy" decoding="async" className="size-20 shrink-0 rounded-full border-2 border-gold-deep/60 object-cover sm:size-24" />
              <div className="min-w-0">
                <p className="font-semibold uppercase leading-snug text-foreground">{person.name}</p>
                <p className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-gold-deep">{person.role}</p>
              </div>
            </li>)}
          </ul>
        </section>
      </main>
    </>
  )
}
