import { redirect } from 'next/navigation'
import SpaceHeader from '@/components/SpaceHeader'
import { requireAnyRole } from '@/lib/auth/requireUser'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAnyRole(['joueur', 'admin'])
  // Les joueurs utilisent l’interface publique, personnalisée à leur nom.
  if (profile.role === 'joueur') redirect('/')
  return (
    <>
      <SpaceHeader title="Espace Joueurs" />
      {children}
    </>
  )
}
