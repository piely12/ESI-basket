import type { Metadata } from 'next'
import Image from 'next/image'
import PlayerNav from '@/components/PlayerNav'
import SpaceHeader from '@/components/SpaceHeader'
import { requireAnyRole } from '@/lib/auth/requireUser'
import { getOwnPseudo } from '@/lib/data/player-pseudo'

// L'espace joueur s'installe comme une app : son propre manifeste démarre sur /joueurs.
export const metadata: Metadata = { manifest: '/manifest-joueur.webmanifest' }

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireAnyRole(['joueur', 'admin'])
  if (profile.role !== 'joueur') {
    return (
      <>
        <SpaceHeader title="Espace Joueurs" />
        {children}
      </>
    )
  }
  const [pseudo, { count }] = await Promise.all([
    getOwnPseudo(supabase, user.id),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
  ])
  return (
    <>
      <header className="public-header">
        <div className="public-header-inner">
          <div className="public-header-team">
            <Image src="/logos/esi.png" alt="" width={50} height={48} priority />
            <span className="truncate">THE LIONS OF ESI</span>
          </div>
          <p className="max-w-[40%] truncate text-sm font-semibold text-on-brand">{pseudo ?? profile.first_name}</p>
        </div>
      </header>
      <div className="pb-24">{children}</div>
      <PlayerNav unread={count ?? 0} />
    </>
  )
}
